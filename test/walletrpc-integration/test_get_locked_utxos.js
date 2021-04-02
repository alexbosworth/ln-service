const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {test} = require('tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getLockedUtxos} = require('./../../');
const {getUtxos} = require('./../../');
const {lockUtxo} = require('./../../');
const {sendToChainAddress} = require('./../../');

const chainAddressRowType = 'chain_address';
const confirmationCount = 6;
const description = 'description';
const format = 'p2wpkh';
const interval = retryCount => 10 * Math.pow(2, retryCount);
const regtestBech32AddressHrp = 'bcrt';
const times = 20;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Locking a UTXO should result in the UTXO being unspendable
test(`Lock UTXO`, async ({end, equal, rejects, strictSame}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.target;

  try {
    await getLockedUtxos({lnd});
  } catch (err) {
    // LND 0.12.1 does not support getting locked UTXOs
    strictSame(
      err,
      [501, 'BackingLndDoesNotSupportGettingLockedUtxos'],
      'Got unsupported error'
    );

    await cluster.kill({});

    return end();
  }

  const {address} = await createChainAddress({format, lnd});

  const [utxo] = (await getUtxos({lnd: cluster.control.lnd})).utxos;

  try {
    const expiresAt = new Date(Date.now() + (1000 * 60 * 5)).toISOString();

    const lock = await lockUtxo({
      expires_at: expiresAt,
      lnd: cluster.control.lnd,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });

    const [locked] = (await getLockedUtxos({lnd: cluster.control.lnd})).utxos;

    const expected = {
      lock_expires_at: lock.expires_at,
      lock_id: lock.id,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    };

    strictSame(locked, expected, 'Got expected UTXO lock');
  } catch (err) {
    strictSame(
      err,
      [501, 'BackingLndDoesNotSupportLockingUtxos'],
      'Got unsupported error'
    );
  }

  await cluster.kill({});

  return end();
});
