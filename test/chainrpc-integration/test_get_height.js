const {readFileSync} = require('fs');

const asyncRetry = require('async/retry');
const {test} = require('tap');

const {generateBlocks} = require('./../macros');
const {getHeight} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const confirmationCount = 6;

// Subscribers to blocks should receive block notifications
test(`Subscribe to blocks`, async ({end, equal, fail}) => {
  const spawned = await spawnLnd({});

  const {kill, lnd} = spawned;

  const startHeight = (await getHeight({lnd})).current_block_height;

  await generateBlocks({
    cert: readFileSync(spawned.chain_rpc_cert),
    count: confirmationCount,
    host: spawned.listen_ip,
    pass: spawned.chain_rpc_pass,
    port: spawned.chain_rpc_port,
    user: spawned.chain_rpc_user,
  });

  await asyncRetry({}, async () => {
    const endHeight = (await getHeight({lnd})).current_block_height;

    if (endHeight - startHeight < confirmationCount) {
      throw new Error('ExpectedHeightIncreaseReflected');
    }

    equal(endHeight - startHeight >= confirmationCount, true, 'Got height');

    return;
  });

  kill();

  await waitForTermination({lnd});

  return end();
});
