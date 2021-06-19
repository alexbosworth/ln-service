const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {chainSendTransaction} = require('./../macros');
const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const {getHeight} = require('./../../');
const {mineTransaction} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {subscribeToChainAddress} = require('./../../');
const {waitForTermination} = require('./../macros');

const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const interval = retryCount => 50 * Math.pow(2, retryCount);
const times = 15;
const tokens = 1e8;

// Subscribing to chain transaction confirmations should trigger events
test(`Subscribe to chain transactions`, async ({end, equal, fail}) => {
  const node = await spawnLnd({});

  const cert = node.chain_rpc_cert_file;
  const host = node.listen_ip;
  const {kill} = node;
  const pass = node.chain_rpc_pass;
  const port = node.chain_rpc_port;
  const {lnd} = node;
  const user = node.chain_rpc_user;

  const startHeight = (await getHeight({lnd})).current_block_height;

  const {address} = await createChainAddress({format, lnd});

  // Generate some funds for LND
  const {blocks} = await node.generate({count});

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
    lnd,
    min_height: startHeight,
    p2sh_address: address,
  });

  let firstConf;

  sub.on('confirmation', conf => firstConf = conf);
  sub.on('error', err => {});

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    await mineTransaction({cert, host, pass, port, transaction, user});

    if (!firstConf) {
      throw new Error('ExpectedSubscribeToChainAddressSeesConfirmation');
    }

    equal(firstConf.block.length, 64, 'Confirmation block hash is returned');
    equal(firstConf.height, 102, 'Confirmation block height is returned');
    equal(firstConf.transaction, transaction, 'Confirmation raw tx returned');

    return;
  });

  let secondConf;

  const sub2 = subscribeToChainAddress({
    lnd,
    min_confirmations: 6,
    min_height: startHeight,
    p2sh_address: address,
  });

  sub2.on('error', () => {});

  sub2.on('confirmation', conf => secondConf = conf);

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    await mineTransaction({cert, host, pass, port, transaction, user});

    if (!secondConf) {
      throw new Error('ExpectedSubscribeToChainAddressSeesMultiConfirmation');
    }

    equal(secondConf.block.length, 64, 'Confirmation block hash is returned');
    equal(secondConf.height, 102, 'Confirmation block height is returned');
    equal(secondConf.transaction, transaction, 'Confirmation raw tx returned');

    return;
  });

  sub.removeAllListeners();
  sub2.removeAllListeners();

  kill();

  await waitForTermination({lnd});

  return end();
});
