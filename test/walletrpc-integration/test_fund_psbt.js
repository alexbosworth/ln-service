const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {decodePsbt} = require('psbt');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {sendToChainAddress} = require('./../../');

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

// Funding a transaction should result in a funded PSBT
test(`Fund PSBT`, async ({end, equal}) => {
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

  const [input] = funded.inputs;

  equal(funded.inputs.length, [utxo].length, 'Got expected number of inputs');
  equal(input.transaction_id, utxo.transaction_id, 'Got expected input tx id');
  equal(input.transaction_vout, utxo.transaction_vout, 'Got expected tx vout');
  equal(input.lock_expires_at > new Date().toISOString(), true, 'Got expires');
  equal(input.lock_id.length, 64, 'Got lock identifier');

  equal(funded.outputs.length, 2, 'Got expected output count');

  const change = funded.outputs.find(n => n.is_change);
  const output = funded.outputs.find(n => !n.is_change);

  equal(change.output_script.length, 44, 'Change address is returned');
  equal(change.tokens, 4998990800, 'Got change output value');

  equal(output.tokens, tokens, 'Got expected tokens output');

  const {data, version} = fromBech32(address);

  const prefix = `${Buffer.from([version]).toString('hex')}14`;

  const expectedOutput = `${prefix}${data.toString('hex')}`;

  equal(output.output_script, expectedOutput, 'Got expected output script');

  const decoded = decodePsbt({psbt: funded.psbt});

  const [decodedInput] = decoded.inputs;

  equal(decodedInput.sighash_type, 1, 'PSBT has sighash all flag');
  equal(!!decodedInput.witness_utxo.script_pub, true, 'PSBT input address');
  equal(decodedInput.witness_utxo.tokens, 4999999000, 'PSBT has input tokens');

  await cluster.kill({});

  return end();
});
