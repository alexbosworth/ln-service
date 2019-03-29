const {test} = require('tap');

const createChainAddress = require('./../../createChainAddress');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getChainBalance = require('./../../getChainBalance');
const getUtxos = require('./../../getUtxos');
const sendToChainAddress = require('./../../sendToChainAddress');
const {subscribeToChainSpend} = require('./../../');

const confirmationCount = 6;
const format = 'p2wpkh';
const tokens = 1e6;

// Subscribing to chain spend should push events on spend confirmations
test(`Subscribe to chain spend`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {address} = await createChainAddress({
    format,
    lnd: cluster.target.lnd,
  });

  const sent = await sendToChainAddress({
    address,
    tokens,
    lnd: cluster.control.lnd,
  });

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const [utxo] = (await getUtxos({lnd: cluster.control.lnd})).utxos;

  const sub = subscribeToChainSpend({
    bech32_address: utxo.address,
    lnd: cluster.target.chain_notifier_lnd,
    transaction_id: utxo.transaction_id,
    transaction_vout: utxo.transaction_vout,
  });

  sub.on('error', err => {});

  sub.on('confirmation', ({height, transaction, vin}) => {
    equal(!!height, true, 'Height of the confirmation is returned');
    equal(!!transaction, true, 'Raw transaction is returned');
    equal(vin, 0, 'Transaction input index is returned');

    return end();
  });

  const toTarget = await createChainAddress({format, lnd: cluster.target.lnd});

  await sendToChainAddress({
    address: toTarget.address,
    is_send_all: true,
    lnd: cluster.control.lnd,
  });

  // Generate to confirm the tx
  await cluster.generate({count: 1, node: cluster.control});

  await cluster.kill({});

  return;
});
