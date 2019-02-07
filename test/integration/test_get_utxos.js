const {readFileSync} = require('fs');

const {test} = require('tap');

const {chainSendTransaction} = require('./../macros');
const createChainAddress = require('./../../createChainAddress');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getUtxos = require('./../../getUtxos');
const {mineTransaction} = require('./../macros');
const {spawnLnd} = require('./../macros');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const tokens = 1e8;

// Getting utxos should list out the utxos
test(`Get utxos`, async ({deepIs, end, equal, fail}) => {
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

  const {utxos} = await getUtxos({lnd});

  equal(utxos.length, [transaction].length, 'Unspent output returned');

  const [utxo] = utxos;

  equal(utxo.address, address, 'UTXO address returned');
  equal(utxo.address_format, format, 'UTXO address format returned');
  equal(utxo.confirmation_count, 6, 'Confirmation count returned');
  equal(!!utxo.output_script, true, 'Output script returned');
  equal(utxo.tokens, tokens - defaultFee, 'UTXO amount returned');
  equal(!!utxo.transaction_id, true, 'UTXO transaction id returned');
  equal(utxo.transaction_vout !== undefined, true, 'UTXO vout returned');

  kill();

  await delay(3000);

  return end();
});
