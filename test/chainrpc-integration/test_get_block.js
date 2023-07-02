const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {idForBlock} = require('@alexbosworth/blockchain');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getBlock} = require('./../../');
const {getHeight} = require('./../../');

// Get height should return height
test(`Get height`, async () => {
  const {nodes} = await spawnLightningCluster({});

  const [{chain, generate, kill, lnd}] = nodes;

  const blockchain = await getHeight({lnd});

  const hash = blockchain.current_block_hash;
  const height = blockchain.current_block_height;

  // Try getting a block by the hash
  try {
    const {block} = await getBlock({lnd, id: blockchain.current_block_hash});

    strictEqual(idForBlock({block}).id, hash, 'Got block');
  } catch (err) {
    const [code, message] = err;

    strictEqual(code, 501, 'Got expected code');
    strictEqual(message, 'GetBlockMethodNotSupported', 'Got expected message');

    await kill({});

    return;
  }

  // Try getting a block by the height
  try {
    const {block} = await getBlock({height, lnd});

    strictEqual(idForBlock({block}).id, hash, 'Got block for height');
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  }

  // Try getting the chain tip block
  try {
    const {block} = await getBlock({lnd});

    strictEqual(idForBlock({block}).id, hash, 'Got chain tip block');
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
