const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChainBalance} = require('./../../');

const emptyChainBalance = 0;
const interval = 1;
const times = 150;
const tokens = 5000000000;

// Getting chain balance should result in a chain balance
test(`Get the chain balance`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  // The initial chain balance should be zero
  {
    const result = await getChainBalance({lnd});

    equal(result.chain_balance, emptyChainBalance, 'Valid chain balance');
  }

  // Generate some funds for LND
  await generate({count: 100});

  // Check that the balance is updated
  const postDeposit = await getChainBalance({lnd});

  equal(postDeposit.chain_balance >= tokens, true, 'Got funds');

  await kill({});

  return end();
});
