const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getUtxos} = require('./../../');
const {lockUtxo} = require('./../../');
const {sendToChainAddress} = require('./../../');

const count = 100;
const size = 2;
const tokens = 1e6;

// Locking a UTXO should result in the UTXO being unspendable
test(`Lock UTXO`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd} = target;

  const {address} = await createChainAddress({lnd});

  await control.generate({count});

  const [utxo] = (await getUtxos({lnd: control.lnd})).utxos;

  try {
    const lock = await lockUtxo({
      expires_at: new Date(Date.now() + (1000 * 60)).toISOString(),
      lnd: control.lnd,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });

    try {
      await lockUtxo({
        id: lock.id,
        lnd: control.lnd,
        transaction_id: utxo.transaction_id,
        transaction_vout: utxo.transaction_vout,
      });
    } catch (err) {
      deepEqual(err, null, 'Relocking the same UTXO should work');
    }

    await rejects(
      sendToChainAddress({
        address,
        tokens,
        lnd: control.lnd,
      }),
      [503, 'InsufficientBalanceToSendToChainAddress'],
      'UTXO is locked'
    );

    await rejects(
      lockUtxo({
        lnd: control.lnd,
        transaction_id: Buffer.alloc(32).toString('hex'),
        transaction_vout: utxo.transaction_vout,
      }),
      [404, 'OutpointToLockNotFoundInUtxoSet'],
      'UTXO must exist'
    );
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
