const {readFileSync} = require('fs');

const {test} = require('tap');

const {chainSendTransaction} = require('./../macros');
const createChainAddress = require('./../../createChainAddress');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {mineTransaction} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {subscribeToChainAddress} = require('./../../');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const tokens = 1e8;

// Subscribing to chain transaction confirmations should trigger events
test(`Subscribe to chain transactions`, async ({deepIs, end, equal, fail}) => {
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

  const [coinbaseTransactionId] = block.transaction_ids;

  const {transaction} = chainSendTransaction({
    tokens,
    destination: address,
    fee: defaultFee,
    private_key: node.mining_key,
    spend_transaction_id: coinbaseTransactionId,
    spend_vout: defaultVout,
  });

  const sub = subscribeToChainAddress({
    lnd: node.chain_notifier_lnd,
    p2sh_address: address,
  });

  sub.on('confirmation', conf => {
    equal(conf.block.length, 64, 'Confirmation block hash is returned');
    equal(conf.height, 102, 'Confirmation block height is returned');
    equal(conf.transaction, transaction, 'Confirmation raw tx is returned');

    return setTimeout(() => {
      kill();

      return end();
    },
    3000);
  });

  sub.on('error', err => {});

  await delay(3000);

  await mineTransaction({cert, host, pass, port, transaction, user});

  return;
});
