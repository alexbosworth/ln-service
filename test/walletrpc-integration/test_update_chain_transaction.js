const {readFileSync} = require('fs');

const asyncRetry = require('async/retry');
const {test} = require('tap');

const {broadcastChainTransaction} = require('./../../');
const {chainSendTransaction} = require('./../macros');
const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
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

  const cert = readFileSync(node.chain_rpc_cert);
  const host = node.listen_ip;
  const {lnd} = node;
  const key = node.mining_key;
  const {kill} = node;
  const pass = node.chain_rpc_pass;
  const port = node.chain_rpc_port;
  const user = node.chain_rpc_user;

  // Generate some funds
  const {blocks} = await generateBlocks({cert, count, host, pass, port, user});

  const [block] = blocks;

  const [coinbaseTransactionId] = block.transaction_ids;

  const {transaction} = chainSendTransaction({
    fee,
    tokens,
    destination: (await createChainAddress({format, lnd})).address,
    private_key: key,
    spend_transaction_id: coinbaseTransactionId,
    spend_vout: defaultVout,
  });

  const {id} = await broadcastChainTransaction({transaction, lnd: node.lnd});

  try {
    await updateChainTransaction({description, lnd, id});
  } catch (err) {
    const [code] = err;

    equal(501, code, 'Method is not supported on LND 0.10.1 and below');

    kill();

    await waitForTermination({lnd});

    return end();
  }

  await asyncRetry({}, async () => {
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
