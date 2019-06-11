const EventEmitter = require('events');
const {readFileSync} = require('fs');

const {test} = require('tap');

const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {subscribeToBlocks} = require('./../../');
const {waitForTermination} = require('./../macros');

const confirmationCount = 6;

// Subscribers to blocks should receive block notifications
test(`Subscribe to blocks`, async ({end, equal, fail}) => {
  let confs = confirmationCount;
  const spawned = await spawnLnd({});

  const {kill, lnd} = spawned;

  const sub = subscribeToBlocks({lnd});

  sub.on('end', () => {});
  sub.on('error', err => {});
  sub.on('status', () => {});

  sub.on('block', async data => {
    equal(data.id.length, 64, 'Block id emitted');
    equal(!!data.height, true, 'Block height emitted');

    confs--;

    if (!!confs) {
      return;
    }

    await delay(3000);

    kill();

    await waitForTermination({lnd});

    return end();
  });

  await generateBlocks({
    cert: readFileSync(spawned.chain_rpc_cert),
    count: confirmationCount,
    host: spawned.listen_ip,
    pass: spawned.chain_rpc_pass,
    port: spawned.chain_rpc_port,
    user: spawned.chain_rpc_user,
  });

  return;
});
