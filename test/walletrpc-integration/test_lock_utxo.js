const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
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

  const {address} = await createChainAddress({format, lnd});

  const [utxo] = (await getUtxos({lnd: cluster.control.lnd})).utxos;

  try {
    const lock = await lockUtxo({
      expires_at: new Date(Date.now() + (1000 * 60)).toISOString(),
      lnd: cluster.control.lnd,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });

    await rejects(
      sendToChainAddress({
        address,
        tokens,
        lnd: cluster.control.lnd,
      }),
      [503, 'InsufficientBalanceToSendToChainAddress'],
      'UTXO is locked'
    );
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
