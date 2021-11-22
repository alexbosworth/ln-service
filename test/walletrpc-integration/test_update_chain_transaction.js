const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChainTransactions} = require('./../../');
const {updateChainTransaction} = require('./../../');

const count = 100;
const description = 'description';

// Test updating the description of a chain transaction
test(`Send chain transaction`, async ({end, equal}) => {
  const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  // Generate some funds
  await generate({count});

  const {transactions} = await getChainTransactions({lnd});

  const [{id}] = transactions;

  await asyncRetry({}, async () => {
    await updateChainTransaction({description, id, lnd});

    const {transactions} = await getChainTransactions({lnd});

    const [tx] = transactions;

    if (tx.description !== description) {
      throw new Error('ExpectedTransactionDescriptionUpdated');
    }

    equal(tx.description, description, 'Got expected transaction');

    return;
  });

  await kill({});

  return end();
});
