const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {decodePsbt} = require('psbt');
const {spawnLightningCluster} = require('ln-docker-daemons');
const tinysecp = require('tiny-secp256k1');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getUtxos} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {signPsbt} = require('./../../');

const chainAddressRowType = 'chain_address';
const confirmationCount = 6;
const count = 100;
const description = 'description';
const format = 'p2wpkh';
const interval = 10;
const regtestBech32AddressHrp = 'bcrt';
const size = 2;
const times = 2000;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Signing a PSBT should result in a finalized PSBT
test(`Sign PSBT`, async () => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);

  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd} = target;

  const {address} = await createChainAddress({format, lnd});

  await control.generate({count});

  const [utxo] = (await getUtxos({lnd: control.lnd})).utxos;

  const funded = await asyncRetry({interval, times}, async () => {
    try {
      return await fundPsbt({
        inputs: [{
          transaction_id: utxo.transaction_id,
          transaction_vout: utxo.transaction_vout,
        }],
        lnd: control.lnd,
        outputs: [{address, tokens}],
      });
    } catch (err) {
      // On LND 0.11.1 and below, funding a PSBT is not supported
      if (err.slice().shift() === 501) {
        return;
      }

      throw err;
    }
  });

  // On LND 0.11.1 and below, funding a PSBT is not supported
  if (!funded) {
    await kill({});

    return;
  }

  const finalized = await signPsbt({lnd: control.lnd, psbt: funded.psbt});

  const tx = componentsOfTransaction({transaction: finalized.transaction});

  const decoded = decodePsbt({ecp, psbt: finalized.psbt});

  equal(!!decoded, true, 'Got a finalized PSBT');
  equal(!!tx, true, 'Got a raw signed transaction');

  await asyncRetry({interval, times}, async () => {
    await broadcastChainTransaction({
      lnd: target.lnd,
      transaction: finalized.transaction,
    });
  });

  const startBalance = (await getChainBalance({lnd})).chain_balance;

  await asyncRetry({interval, times}, async () => {
    await target.generate({});

    const chainBalance = (await getChainBalance({lnd})).chain_balance;

    if (chainBalance !== startBalance + tokens) {
      throw new Error('ExpectedTargetReceivedChainTransfer');
    }

    equal(chainBalance, startBalance + tokens, 'Funds received');

    return;
  });

  await kill({});

  return;
});
