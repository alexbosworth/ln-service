const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getUtxos} = require('./../../');
const {lockUtxo} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {unlockUtxo} = require('./../../');

const count = 100;
const size = 2;
const tokens = 1e6;

// Unlocking a UTXO should result in the UTXO becoming spendable
test(`Unlock UTXO`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd} = target;

  const {address} = await createChainAddress({lnd});

  await control.generate({count});

  const [utxo] = (await getUtxos({lnd: control.lnd})).utxos;

  try {
    // Locking the UTXO should result in a locked UTXO
    const lock = await lockUtxo({
      lnd: control.lnd,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });

    // Trying to send should throw an error due to a locked UTXO
    await rejects(
      sendToChainAddress({
        address,
        tokens,
        lnd: control.lnd,
      }),
      [503, 'InsufficientBalanceToSendToChainAddress'],
      'UTXO is locked'
    );

    // Unlocking the UTXO should unlock the UTXO
    await unlockUtxo({
      id: lock.id,
      lnd: control.lnd,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });

    // Now the send should go without error
    await sendToChainAddress({address, tokens, lnd: control.lnd});
  } catch (err) {
    deepEqual(
      err,
      [501, 'BackingLndDoesNotSupportLockingUtxos'],
      'Got unsupported error'
    );
  }

  await kill({});

  return;
});
