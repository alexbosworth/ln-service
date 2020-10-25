const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {decodePsbt} = require('psbt');
const {test} = require('tap');
const {Transaction} = require('bitcoinjs-lib');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {signPsbt} = require('./../../');

const chainAddressRowType = 'chain_address';
const confirmationCount = 6;
const description = 'description';
const format = 'p2wpkh';
const {fromBech32} = address;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const regtestBech32AddressHrp = 'bcrt';
const times = 20;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Signing a PSBT should result in a finalized PSBT
test(`Sign PSBT`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.target;

  const {address} = await createChainAddress({format, lnd});

  const [utxo] = (await getUtxos({lnd: cluster.control.lnd})).utxos;

  const funded = await asyncRetry({interval, times}, async () => {
    try {
      return await fundPsbt({
        inputs: [{
          transaction_id: utxo.transaction_id,
          transaction_vout: utxo.transaction_vout,
        }],
        lnd: cluster.control.lnd,
        outputs: [{address, tokens}],
      });
    } catch (err) {
      // On LND 0.11.1 and below, funding a PSBT is not supported
      if (err.shift() === 501) {
        return;
      }

      throw err;
    }
  });

  // On LND 0.11.1 and below, funding a PSBT is not supported
  if (!funded) {
    await cluster.kill({});

    return end();
  }

  const finalized = await signPsbt({
    lnd: cluster.control.lnd,
    psbt: funded.psbt,
  });

  const tx = Transaction.fromHex(finalized.transaction);

  const decoded = decodePsbt({psbt: finalized.psbt});

  equal(!!decoded, true, 'Got a finalized PSBT');
  equal(!!tx, true, 'Got a raw signed transaction');

  await broadcastChainTransaction({
    lnd: cluster.target.lnd,
    transaction: finalized.transaction,
  });

  await asyncRetry({interval, times}, async () => {
    await cluster.generate({node: cluster.target});

    const chainBalance = (await getChainBalance({lnd})).chain_balance;

    if (chainBalance !== 5000999000) {
      throw new Error('ExpectedTargetReceivedChainTransfer');
    }

    return;
  });

  await cluster.kill({});

  return end();
});
