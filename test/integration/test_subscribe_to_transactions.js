const {test} = require('tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {sendToChainAddress} = require('./../../');
const {subscribeToTransactions} = require('./../../');

const confirmationCount = 6;
const format = 'p2wpkh';
const tokens = 1e6;

// Subscribing to chain transactions should 
test(`Subscribe to chain transactions`, async ({end, equal, fail}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.target;

  let isConfirmed = false;
  const sub = subscribeToTransactions({lnd: cluster.control.lnd});

  sub.on('error', () => {});

  sub.on('chain_transaction', tx => {
    if (!!isConfirmed) {
      return;
    }

    equal(!!tx.created_at, true, 'Tx has a creation date');
    equal(tx.is_outgoing, true, 'Tx is outgoing');
    equal(tx.fee, 8200, 'Transaction has a chain fee');
    equal(!!tx.id, true, 'Tx has an id');
    equal(tx.tokens, 1008200, 'Tx tokens is fee + tokens sent');

    if (tx.is_confirmed !== false && tx.is_confirmed !== true) {
      fail('Transaction must have confirmation status');
    }

    if (!tx.is_confirmed) {
      equal(tx.block_id, null, 'Tx is not confirmed in a block');
      equal(tx.confirmation_count, 0, 'Tx has no confirmations');

      return;
    }

    isConfirmed = true;

    equal(!!tx.block_id, true, 'Tx is confirmed in a block');
    equal(tx.confirmation_count, [tx].length, 'Tx has a confirmation');

    return end();
  });

  const sent = await sendToChainAddress({
    tokens,
    address: (await createChainAddress({format, lnd})).address,
    lnd: cluster.control.lnd,
  });

  await delay(1000);

  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await cluster.kill({});
});
