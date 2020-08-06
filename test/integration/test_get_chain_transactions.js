const {readFileSync} = require('fs');

const asyncRetry = require('async/retry');
const {test} = require('tap');

const {chainSendTransaction} = require('./../macros');
const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getWalletVersion} = require('./../../');
const {mineTransaction} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');
const {waitForUtxo} = require('./../macros');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const emptyChainBalance = 0;
const format = 'np2wpkh';
const interval = retryCount => 10 * Math.pow(2, retryCount);
const times = 20;
const tokens = 1e8;

// Getting chain transactions should list out the chain transactions
test(`Get chain transactions`, async ({deepIs, end, equal, fail}) => {
  const node = await spawnLnd({});

  const cert = readFileSync(node.chain_rpc_cert);
  const host = node.listen_ip;
  const {kill} = node;
  const pass = node.chain_rpc_pass;
  const port = node.chain_rpc_port;
  const {lnd} = node;
  const user = node.chain_rpc_user;

  const {address} = await createChainAddress({format, lnd});

  // Generate some funds for LND
  const {blocks} = await generateBlocks({cert, count, host, pass, port, user});

  const [block] = blocks;

  const [coinbaseTransaction] = block.transaction_ids;

  const {transaction} = chainSendTransaction({
    tokens,
    destination: address,
    fee: defaultFee,
    private_key: node.mining_key,
    spend_transaction_id: coinbaseTransaction,
    spend_vout: defaultVout,
  });

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await mineTransaction({cert, host, pass, port, transaction, user});

    const {transactions} = await getChainTransactions({lnd});

    const [tx] = transactions;

    if (!tx.is_confirmed) {
      throw new Error('ExpectedTransactionConfirmed');
    }

    return;
  });

  const {transactions} = await getChainTransactions({lnd});

  equal(transactions.length, [transaction].length, 'Transaction found');

  const [tx] = transactions;

  equal(tx.is_confirmed, true, 'Transaction is confirmed');
  equal(tx.is_outgoing, false, 'Transaction is incoming');
  deepIs(tx.output_addresses, [address], 'Address is returned');
  equal(tx.tokens, tokens - defaultFee, 'Chain tokens are returned');

  try {
    const wallet = await getWalletVersion({lnd});

    const unsupportingCommits = {
      '0d5b0fefa4d9082f7964836f5e58c3a6bda8e471': true,
      '1e04b7f54360427a23a5daf4a5a0648e6a81f3a6': true,
      '4f2221d56c8212ddc4f48a4e6a6ee57255e61195': true,
      '86114c575c2dff9dff1e1bb4df961c64aea9fc1c': true,
      'ae6e84ddfd3c4d2366e151a04aca3f78b4078ed5': true,
      'd62c575f8499a314eb27f12462d20500b6bda2c7': true,
      'e8833042799d71dba209fe305ce3ae105c154cfe': true,
    };

    const isV10 = wallet.version === '0.10.0-beta';
    const isV101 = wallet.version === '0.10.1-beta';

    if (!unsupportingCommits[wallet.commit_hash] && !isV10 && !isV101) {
      const onlyAfter = await getChainTransactions({
        lnd,
        after: tx.confirmation_height,
      });

      equal(onlyAfter.transactions.length, [].length, 'No transactions after');

      const onlyBefore = await getChainTransactions({
        lnd,
        before: tx.confirmation_height,
      });

      equal(onlyBefore.transactions.length, [].length, 'No tx before');

      const between = await getChainTransactions({
        lnd,
        after: tx.confirmation_height - 1,
        before: tx.confirmation_height + 1,
      });

      deepIs(between.transactions.length, [tx].length, 'One transaction');
    }
  } catch (err) {
    deepIs(err, [501, 'VersionMethodUnsupported'], 'Using legacy LND');
  }

  kill();

  await waitForTermination({lnd});

  return end();
});
