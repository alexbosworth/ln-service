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

  const hash = blockchain.current_block_hash;
  const height = blockchain.current_block_height;

  // Try getting a block by the hash
  try {
    const {block} = await getBlock({lnd, id: blockchain.current_block_hash});

    equal(fromHex(block).getId(), hash, 'Got block');
  } catch (err) {
    const [code, message] = err;

    equal(code, 501, 'Got expected code');
    equal(message, 'GetBlockMethodNotSupported', 'Got expected message');

    await kill({});

    return end();
  }

  // Try getting a block by the height
  try {
    const {block} = await getBlock({height, lnd});

    equal(fromHex(block).getId(), hash, 'Got block for height');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  // Try getting the chain tip block
  try {
    const {block} = await getBlock({lnd});

    equal(fromHex(block).getId(), hash, 'Got chain tip block');
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
