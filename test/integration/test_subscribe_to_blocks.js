const EventEmitter = require('events');
const {readFileSync} = require('fs');

const {test} = require('tap');

const {generateBlocks} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {subscribeToBlocks} = require('./../../');

const confirmationCount = 6;

// Subscribers to blocks should receive block notifications
test(`Subscribe to blocks`, async ({end, equal, fail}) => {
  let confs = confirmationCount;
  const spawned = await spawnLnd({});

  const {kill} = spawned;

  const lnd = spawned.chain_notifier_lnd;

  const sub = subscribeToBlocks({lnd});

  sub.on('end', () => {});
  sub.on('error', err => {});
  sub.on('status', () => {});

  sub.on('data', data => {
    equal(data.id.length, 64, 'Block id emitted');
    equal(!!data.height, true, 'Block height emitted');

    confs--;

    if (!!confs) {
      return;
    }

    return setTimeout(() => {
      kill();

      return end();
    },
    3000);
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
