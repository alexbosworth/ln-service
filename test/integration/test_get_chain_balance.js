const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChainBalance} = require('./../../');

const count = 100;
const emptyChainBalance = 0;
const tokens = 5000000000;

// Getting chain balance should result in a chain balance
test(`Get the chain balance`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  // The initial chain balance should be zero
  {
    const result = await getChainBalance({lnd});

    strictEqual(result.chain_balance, emptyChainBalance, 'Got chain balance');
  }

  // Generate some funds for LND
  await generate({count});

  // Check that the balance is updated
  const postDeposit = await getChainBalance({lnd});

  strictEqual(postDeposit.chain_balance >= tokens, true, 'Got funds');

  await kill({});

  return;
});
