const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getHeight} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {subscribeToTransactions} = require('./../../');

const confirmationCount = 6;
const interval = 100;
const size = 2;
const times = 200;
const tokens = 1e6;

// Subscribing to chain transactions should result in tx events
test(`Subscribe to chain transactions`, async ({end, equal, fail}) => {
  const transactions = [];

  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await asyncRetry({times}, async () => {
    if (!!(await getChainBalance({lnd})).chain_balance) {
      return;
    }

    await generate({});

    throw new Error('ExpectedChainBalance');
  });

  let isConfirmed = false;
  const startHeight = (await getHeight({lnd})).current_block_height
  const sub = subscribeToTransactions({lnd});

  sub.on('error', () => {});
  sub.on('chain_transaction', tx => transactions.push(tx));

  const sent = await sendToChainAddress({
    lnd,
    tokens,
    address: (await createChainAddress({lnd: target.lnd})).address,
  });

  // Generate to confirm the tx
  await generate({count: confirmationCount});

  const tx = await asyncRetry({interval, times}, async () => {
    const [tx] = transactions
      .filter(n => n.is_confirmed)
      .filter(n => n.output_addresses.length == 2);

    if (!tx) {
      throw new Error('ExpectedConfirmedTransaction');
    }

    return tx;
  });

  equal(!!tx.created_at, true, 'Tx has a creation date');
  equal(tx.is_outgoing, true, 'Tx is outgoing');
  equal(tx.fee, 7050, 'Transaction has a chain fee');
  equal(!!tx.id, true, 'Tx has an id');
  equal(tx.tokens, 1007050, 'Tx tokens is fee + tokens sent');

  if (!!tx.output_addresses.find(n => n.length < 14 || n.length > 74)) {
    fail('Output address lengths must be between 14 and 74');
  }

  equal(!!tx.block_id, true, 'Tx is confirmed in a block');
  equal(tx.confirmation_count, [tx].length, 'Tx has a confirmation');
  equal(tx.confirmation_height >= startHeight, true, 'Got block height');

  await kill({});

  return end();
});
