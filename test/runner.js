const {join} = require('node:path');
const {once} = require('node:events');
const {readdirSync} = require('node:fs');
const {run} = require('node:test');
const {spec} = require('node:test/reporters');

const {cleanUpLightningClusters} = require('ln-docker-daemons');
const {prepareLightningClusters} = require('ln-docker-daemons');

const capacity = 1e6;
const concurrency = 3;
const failureExitCode = 1;
const {keys} = Object;
const signalExitCodes = {SIGINT: 130, SIGTERM: 143};
const timeout = 1000 * 60 * 3;

const dirs = [
  'autopilotrpc-integration',
  'chainrpc-integration',
  'integration',
  'invoicesrpc-integration',
  'peersrpc-integration',
  'routerrpc-integration',
  'signerrpc-integration',
  'tower_clientrpc-integration',
  'tower_serverrpc-integration',
  'versionrpc-integration',
  'walletrpc-integration',
];

// Cluster shapes that most tests spawn, other shapes are made from scratch
const specs = [
  {},
  {size: 2},
  {size: 3},
  {capacity, size: 2},
  {capacity, size: 3},
];

const asPath = file => join(file.path || file.parentPath, file.name);
const flatten = arr => [].concat(...arr);

const files = flatten(dirs.map(dir => {
  return readdirSync(join(__dirname, dir), {withFileTypes: true}).map(asPath);
}));

const started = {abort: new AbortController()};

// Remove the templates and Docker objects of the run when it is interrupted
keys(signalExitCodes).forEach(signal => {
  return process.once(signal, () => {
    const exit = () => cleanUpLightningClusters({}, () => {
      return process.exit(signalExitCodes[signal]);
    });

    started.is_interrupted = true;

    // Exit early when no test files were started
    if (!started.tests) {
      return exit();
    }

    // The test files stop, and their processes are all gone at beforeExit
    process.once('beforeExit', exit);

    return started.abort.abort();
  });
});

(async () => {
  try {
    // Build the cluster templates once, test files restore copies of them
    await prepareLightningClusters({specs});

    const {signal} = started.abort;

    started.tests = run({concurrency, files, signal, timeout});

    started.tests.on('test:fail', () => process.exitCode = failureExitCode);

    started.tests.compose(spec).pipe(process.stdout);

    await once(started.tests, 'end');
  } catch (err) {
    console.error(err);

    process.exitCode = failureExitCode;
  }

  // Exit early when interrupted, the interruption cleans up afterwards
  if (!!started.is_interrupted) {
    return;
  }

  try {
    // Remove the templates and Docker objects of the run
    await cleanUpLightningClusters({});
  } catch (err) {
    console.error(err);

    process.exitCode = failureExitCode;
  }
})();
