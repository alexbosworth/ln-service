const {test} = require('tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getUtxos} = require('./../../');
const {getWalletInfo} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {subscribeToChainSpend} = require('./../../');

const confirmationCount = 20;
const format = 'p2wpkh';
const tokens = 1e6;

// Subscribing to chain spend should push events on spend confirmations
test(`Subscribe to chain spend`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});
  let gotAddressConf = false;

  const {lnd} = cluster.control;

  const startHeight = (await getWalletInfo({lnd})).current_block_height;

  const {address} = await createChainAddress({
    format,
    lnd: cluster.target.lnd,
  });

  const sent = await sendToChainAddress({address, lnd, tokens});

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const [utxo] = (await getUtxos({lnd: cluster.control.lnd})).utxos;

  const sub = subscribeToChainSpend({
    lnd,
    bech32_address: utxo.address,
    min_height: startHeight,
    transaction_id: utxo.transaction_id,
    transaction_vout: utxo.transaction_vout,
  });

  sub.on('error', err => {});

  sub.once('confirmation', ({height, transaction, vin}) => {
    equal(!!height, true, 'Height of the confirmation is returned');
    equal(!!transaction, true, 'Raw transaction is returned');
    equal(vin, 0, 'Transaction input index is returned');

    return gotAddressConf = true;
  });

  const toTarget = await createChainAddress({format, lnd: cluster.target.lnd});

  await sendToChainAddress({
    lnd,
    address: toTarget.address,
    is_send_all: true,
  });

  await delay(2000);

  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await cluster.kill({});

  await delay(2000);

  equal(gotAddressConf, true, 'Subscribe to address sees confirmation');

  return end();
});
