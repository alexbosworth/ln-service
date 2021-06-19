const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {broadcastChainTransaction} = require('./../../');
const {chainSendTransaction} = require('./../macros');
const {createChainAddress} = require('./../../');
const {generateBlocks} = require('./../macros');
const {getChainTransactions} = require('./../../');
const {spawnLnd} = require('./../macros');
const {updateChainTransaction} = require('./../../');
const {waitForTermination} = require('./../macros');

const count = 100;
const defaultVout = 0;
const description = 'description';
const fee = 1e3;
const format = 'np2wpkh';
const tokens = 1e8;

// Test updating the description of a chain transaction
test(`Send chain transaction`, async ({end, equal}) => {
  const node = await spawnLnd({});

  const {lnd} = node;
  const {kill} = node;

  // Generate some funds
  const {blocks} = await node.generate({count});

  const [block] = blocks;

  const [coinbaseTransactionId] = block.transaction_ids;

  const {transaction} = chainSendTransaction({
    fee,
    tokens,
    destination: (await createChainAddress({format, lnd})).address,
    private_key: node.mining_key,
    spend_transaction_id: coinbaseTransactionId,
    spend_vout: defaultVout,
  });

  const {id} = await broadcastChainTransaction({transaction, lnd: node.lnd});

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

  kill();

  await waitForTermination({lnd});

  return end();
});
