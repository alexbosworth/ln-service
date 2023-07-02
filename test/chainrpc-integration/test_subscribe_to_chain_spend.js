const {once} = require('node:events');
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {getHeight} = require('./../../');
const {getUtxos} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {subscribeToBlocks} = require('./../../');
const {subscribeToChainSpend} = require('./../../');

const confirmationCount = 6;
const count = 100;
const format = 'p2wpkh';
const interval = 1;
const race = promises => Promise.race(promises);
const size = 2;
const times = 1000;
const tokens = 1e6;

// Subscribing to chain spend should push events on spend confirmations
test(`Subscribe to chain spend`, async () => {
  let gotAddressConf = false;

  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const cluster = {control, target};

  const {address} = await createChainAddress({lnd: target.lnd});
  const {lnd} = control;

  // Wait for chainrpc to be active
  await control.generate({count});

  const startHeight = (await getHeight({lnd})).current_block_height;

  await asyncRetry({interval, times}, async () => {
    const subBlocks = subscribeToBlocks({lnd});

    const [event] = await race([
      once(subBlocks, 'block'),
      once(subBlocks, 'error'),
    ]);

    if (!event.height) {
      throw new Error('ExpectedBlockEvent');
    }
  });

  const sent = await asyncRetry({times}, async () => {
    await control.generate({});

    return await sendToChainAddress({address, lnd, tokens});
  });

  await control.generate({count: 1});

  const {utxos} = await getUtxos({lnd});

  const [utxo] = utxos.filter(n => n.address_format === 'p2wpkh');

  await control.generate({count});

  const sub = subscribeToChainSpend({
    lnd,
    bech32_address: utxo.address,
    min_height: startHeight,
    transaction_id: utxo.transaction_id,
    transaction_vout: utxo.transaction_vout,
  });

  sub.on('error', err => {});

  sub.once('confirmation', ({height, transaction, vin}) => {
    strictEqual(!!height, true, 'Height of the confirmation is returned');
    strictEqual(!!transaction, true, 'Raw transaction is returned');
    strictEqual(vin !== undefined, true, 'Transaction input index returned');

    return gotAddressConf = true;
  });

  const toTarget = await createChainAddress({lnd: target.lnd});

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    try {
      await sendToChainAddress({
        lnd,
        address: toTarget.address,
        is_send_all: true,
      });
    } catch (err) {
    }

    // Generate to confirm the tx
    await control.generate({count: confirmationCount});

    if (!gotAddressConf) {
      throw new Error('ExpectedSubscribeToAddressSeesConfirmation');
    }

    return;
  });

  await kill({});

  strictEqual(gotAddressConf, true, 'Subscribe to address sees confirmation');

  return;
});
