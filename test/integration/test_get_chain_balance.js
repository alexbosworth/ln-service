const {readFileSync} = require('fs');

const {test} = require('tap');

const {chainSendTransaction} = require('./../macros');
const createChainAddress = require('./../../createChainAddress');
const {generateBlocks} = require('./../macros');
const getChainBalance = require('./../../getChainBalance');
const {mineTransaction} = require('./../macros');
const {spawnLnd} = require('./../macros');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const emptyChainBalance = 0;
const format = 'np2wpkh';
const tokens = 1e8;

// Getting chain balance should result in a chain balance
test(`Get the chain balance`, async ({end, equal}) => {
  const node = await spawnLnd({});

  const cert = readFileSync(node.chain_rpc_cert);
  const host = node.listen_ip;
  const {kill} = node;
  const pass = node.chain_rpc_pass;
  const port = node.chain_rpc_port;
  const {lnd} = node;
  const user = node.chain_rpc_user;

  const {address} = await createChainAddress({format, lnd});

  // The initial chain balance should be zero
  {
    const result = await getChainBalance({lnd});

    equal(result.chain_balance, emptyChainBalance, 'Valid chain balance');
  }

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

  // Check that the balance is updated
  const postDeposit = await getChainBalance({lnd});

  equal(postDeposit.chain_balance, tokens - defaultFee, 'Deposited funds');

  kill();

  return end();
});

