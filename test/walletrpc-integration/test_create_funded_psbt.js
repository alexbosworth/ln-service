const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {createFundedPsbt} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {lockUtxo} = require('./../../');
const {signPsbt} = require('./../../');

const bufferAsHex = buffer => buffer.toString('hex');
const {concat} = Buffer;
const count = 100;
const format = 'p2tr';
const {fromBech32} = address;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const OP_1 = Buffer.from([81]);
const push32 = Buffer.from([32]);
const sequence = 0;
const timelock = 1;
const times = 20;
const version = 1;

// Creating a funded PSBT should result in a funded PSBT
test(`Create funded PSBT`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  await generate({count});

  try {
    await createFundedPsbt({lnd});
  } catch (err) {
    if (!Array.isArray(err)) {
      await kill({});

      equal(err, null, 'Expected array error');

      return;
    }

    const [code, message] = err;

  // LND 0.17.5 and before do not support the create funded PSBT method
    if (code === 501) {
      await kill({});

      equal(message, 'CreateFundedPsbtMethodNotSupported', 'Unsupported');

      return;
    }
  }

  try {
    const {address} = await createChainAddress({format, lnd});
    const {utxos} = await getUtxos({lnd});

    const outputScriptElements = [OP_1, push32, fromBech32(address).data];
    const [utxo] = utxos;

    const output = bufferAsHex(concat(outputScriptElements));

    // Creating a funded PSBT requires pre-locking the inputs
    const lock = await lockUtxo({
      lnd,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });

    const {psbt} = await createFundedPsbt({
      fee_tokens_per_vbyte: 50,
      lnd,
      inputs: [{
        sequence,
        transaction_id: utxo.transaction_id,
        transaction_vout: utxo.transaction_vout,
      }],
      outputs: [{is_change: true, script: output, tokens: 1}],
      timelock,
      version,
    });

    const signed = await signPsbt({lnd, psbt});

    // Make sure this tx can be published
    await broadcastChainTransaction({lnd, transaction: signed.transaction});

    // Make sure the publishing succeeded by looking for it in chain txns
    const {transactions} = await getChainTransactions({lnd});

    const [{transaction}] = transactions;

    equal(signed.transaction, transaction, 'Transaction is broadcast');

    const tx = componentsOfTransaction({transaction});

    // Check all the elements of the 1 in 1 out transaction
    equal(tx.inputs.length, [utxo].length, 'Used a single input');
    equal(tx.inputs[0].sequence, sequence, 'Used specified input sequence');
    equal(tx.inputs[0].id, utxo.transaction_id, 'Used specified tx id');
    equal(tx.inputs[0].vout, utxo.transaction_vout, 'Used specified tx vout');
    equal(tx.locktime, timelock, 'Used specified timelock value');
    equal(tx.outputs.length, [output].length, 'Used a single output');
    equal(tx.outputs[0].script, output, 'Output used output script');
    equal(tx.outputs[0].tokens, 4999993913, 'Output spent all tokens');
    equal(tx.version, version, 'Used specified version value');

    // Create a 1 in 2 out transaction, so one with change
    const withChange = await asyncRetry({interval, times}, async () => {
      await generate({});

      return await createFundedPsbt({
        lnd,
        outputs: [{script: output, tokens: 500}],
      });
    });

    const signedChange = await signPsbt({lnd, psbt: withChange.psbt});

    const signedTx = componentsOfTransaction({
      transaction: signedChange.transaction,
    });

    equal(signedTx.outputs.length, 2, 'Change output created');
  } catch (err) {
    await kill({});

    equal(err, null, 'No error expected');
  }

  await kill({});

  return;
});
