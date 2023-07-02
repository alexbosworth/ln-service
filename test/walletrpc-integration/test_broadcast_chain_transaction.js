const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainTransactions} = require('./../../');
const {signPsbt} = require('./../../');

const count = 100;
const description = 'description';
const interval = 10;
const times = 2000;
const tokens = 1e8;

// Test sending a chain transaction to Bitcoin network peers
test(`Broadcast chain transaction`, async () => {
  const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  try {
    await generate({count});

    const {address} = await createChainAddress({lnd});

    const {psbt} = await fundPsbt({lnd, outputs: [{address, tokens}]});

    const {transaction} = await signPsbt({lnd, psbt});

    const {id} = await broadcastChainTransaction({
      description,
      lnd,
      transaction,
    });

    await asyncRetry({interval, times}, async () => {
      const {transactions} = await getChainTransactions({lnd});

      await generate({});

      const tx = transactions.find(n => n.id === id);

      if (!tx) {
        throw new Error('ExpectedTransactionBroadcast');
      }

      if (!tx.is_confirmed) {
        throw new Error('ExpectedTransactionConfirmed');
      }

      equal(tx.description, description, 'Description is set');
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
