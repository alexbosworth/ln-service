const {readFileSync} = require('fs');

const {test} = require('tap');

const {chainSendTransaction} = require('./../macros');
const createChainAddress = require('./../../createChainAddress');
const {generateBlocks} = require('./../macros');
const getChainBalance = require('./../../getChainBalance');
const getChainTransactions = require('./../../getChainTransactions');
const {mineTransaction} = require('./../macros');
const {spawnLnd} = require('./../macros');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const emptyChainBalance = 0;
const format = 'np2wpkh';
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

  await mineTransaction({cert, host, pass, port, transaction, user});

  const {transactions} = await getChainTransactions({lnd});

  equal(transactions.length, [transaction].length, 'Transaction found');

  const [tx] = transactions;

  equal(tx.is_confirmed, true, 'Transaction is confirmed');
  equal(tx.is_outgoing, false, 'Transaction is incoming');
  deepIs(tx.output_addresses, [address], 'Address is returned');
  equal(tx.tokens, tokens - defaultFee, 'Chain tokens are returned');
  equal(tx.type, 'chain_transaction', 'Chain transaction type');

  kill();

  return end();
});

