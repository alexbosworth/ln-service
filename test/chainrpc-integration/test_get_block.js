const asyncRetry = require('async/retry');
const {Block} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getBlock} = require('./../../');
const {getHeight} = require('./../../');

const confirmationCount = 6;
const {fromHex} = Block;
const times = 100;

// Get height should return height
test(`Get height`, async ({end, equal, fail}) => {
  const {nodes} = await spawnLightningCluster({});

  const [{chain, generate, kill, lnd}] = nodes;

  const blockchain = await getHeight({lnd});

  try {
    const {block} = await getBlock({lnd, id: blockchain.current_block_hash});

    equal(fromHex(block).getId(), blockchain.current_block_hash, 'Got block');
  } catch (err) {
    const [code, message] = err;

    equal(code, 501, 'Got expected code');
    equal(message, 'GetBlockMethodNotSupported', 'Got expected message');
  }

  await kill({});

  return end();
});
