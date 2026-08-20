const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {controlBlock} = require('p2tr');
const {createPsbt} = require('psbt');
const {decodeBech32Address} = require('@alexbosworth/blockchain');
const {hashForTree} = require('p2tr');
const {idForTransaction} = require('@alexbosworth/blockchain');
const {p2wpkhOutputScript} = require('@alexbosworth/blockchain');
const {scriptElementsAsScript} = require('@alexbosworth/blockchain');
const {spawnLightningCluster} = require('ln-docker-daemons');
const tinysecp = require('tiny-secp256k1');
const {transactionFromComponents} = require('@alexbosworth/blockchain');
const {v1OutputScript} = require('p2tr');

const {beginGroupSigningSession} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getPublicKey} = require('./../../');
const {getUtxos} = require('./../../');
const {signPsbt} = require('./../../');
const {signTransaction} = require('./../../');

const bufferAsHex = buffer => buffer.toString('hex');
const compile = elements => scriptElementsAsScript({elements}).script;
const componentsOfTx = tx => componentsOfTransaction({transaction: tx});
const count = 100;
const defaultInternalKey = '0350929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';
const defaultLocktime = 0;
const defaultSequence = 0xffffffff;
const defaultTxVersion = 1;
const emptyScriptSig = '';
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const idForTx = transaction => idForTransaction({transaction}).id;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const OP_CHECKSIG = 172;
const p2wpkh = hash => p2wpkhOutputScript({hash}).script;
const smallTokens = 2e5;
const times = 20;
const tokens = 1e6;
const transactionSighashDefault = 0;

// Signing a taproot transaction should result in a valid signature
test(`Sign a taproot transaction`, async () => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  try {
    await beginGroupSigningSession({
      lnd,
      is_key_spend: true,
      key_family: 0,
      key_index: 0,
      public_keys: [Buffer.alloc(33, 2).toString('hex')],
    });
  } catch (err) {
    // On LND 0.14.5 and below, taproot signing is not supported
    if (err.slice().shift() === 501) {
      await kill({});

      return;
    }

    throw err;
  }

  await generate({count});

  const {address} = await createChainAddress({lnd});
  const [utxo] = (await getUtxos({lnd})).utxos;

  const funded = await asyncRetry({interval, times}, async () => {
    try {
      return await fundPsbt({
        lnd,
        inputs: [{
          transaction_id: utxo.transaction_id,
          transaction_vout: utxo.transaction_vout,
        }],
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

  // A Taproot script output should be funded and spent with script
  try {
    await generate({count});

    const scriptKey = await getPublicKey({lnd, family: 805});

    const publicKey = hexAsBuffer(scriptKey.public_key);

    const witnessScript = compile([publicKey.slice(1), OP_CHECKSIG]);

    const branches = [{script: witnessScript}];

    const {hash} = hashForTree({branches});

    const output = v1OutputScript({hash, internal_key: defaultInternalKey});

    const [utxo] = (await getUtxos({lnd})).utxos.reverse();

    // Make a PSBT paying to the Taproot output
    const {psbt} = createPsbt({
      outputs: [{tokens, script: output.script}],
      utxos: [{id: utxo.transaction_id, vout: utxo.transaction_vout}],
    });

    // Sign the PSBT
    const signed = await signPsbt({
      lnd,
      psbt: (await fundPsbt({lnd, psbt})).psbt,
    });

    // Send the tx to the chain
    await broadcastChainTransaction({lnd, transaction: signed.transaction});

    const spends = componentsOfTx(signed.transaction).outputs;

    // The new tx spends the Taproot output
    const inputs = [{
      id: idForTx(signed.transaction),
      script: emptyScriptSig,
      sequence: defaultSequence,
      vout: spends.findIndex(n => n.tokens === tokens),
    }];

    // Make an output to pay back into the wallet
    const chainAddress = await createChainAddress({lnd});

    const {program} = decodeBech32Address({address: chainAddress.address});

    // Add output to the pay back transaction
    const outputs = [{
      script: bufferAsHex(p2wpkh(program)),
      tokens: smallTokens,
    }];

    // Make a new tx that will spend the output back into the wallet
    const unsigned = transactionFromComponents({
      inputs,
      outputs,
      locktime: defaultLocktime,
      version: defaultTxVersion,
    });

    const {signatures} = await signTransaction({
      lnd,
      inputs: [{
        key_family: 805,
        key_index: scriptKey.index,
        output_script: output.script,
        output_tokens: tokens,
        root_hash: hash,
        sighash: transactionSighashDefault,
        vin: 0,
        witness_script: witnessScript,
      }],
      transaction: unsigned.transaction,
    });

    const [signature] = signatures;

    const {block} = controlBlock({
      external_key: output.external_key,
      leaf_script: witnessScript,
      script_branches: branches,
    });

    // Add the signature to the input and serialize the signed transaction
    const {transaction} = transactionFromComponents({
      outputs,
      inputs: inputs.map(input => ({
        id: input.id,
        script: input.script,
        sequence: input.sequence,
        vout: input.vout,
        witness: [signature, witnessScript, block],
      })),
      locktime: defaultLocktime,
      version: defaultTxVersion,
    });

    await broadcastChainTransaction({lnd, transaction});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {utxos} = await getUtxos({lnd});

      const utxo = utxos.find(n => n.transaction_id === idForTx(transaction));

      if (!utxo || !utxo.confirmation_count) {
        throw new Error('ExpectedReceivedTaprootSpend');
      }
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  // A Taproot script can be funded and spent with internal key + script hash
  try {
    await generate({count});

    const topLevelKey = await getPublicKey({lnd, family: 805});

    const unusedKey = ecp.makeRandom({});

    const witnessScript = compile([
      Buffer.from(unusedKey.publicKey).slice(1),
      OP_CHECKSIG,
    ]);

    const branches = [{script: witnessScript}];

    const {hash} = hashForTree({branches});

    const output = v1OutputScript({
      hash,
      internal_key: topLevelKey.public_key,
    });

    const [utxo] = (await getUtxos({lnd})).utxos.reverse();

    // Make a PSBT paying to the Taproot output
    const {psbt} = createPsbt({
      outputs: [{tokens, script: output.script}],
      utxos: [{id: utxo.transaction_id, vout: utxo.transaction_vout}],
    });

    // Sign the PSBT
    const signed = await signPsbt({
      lnd,
      psbt: (await fundPsbt({lnd, psbt})).psbt,
    });

    // Send the tx to the chain
    await broadcastChainTransaction({lnd, transaction: signed.transaction});

    const spends = componentsOfTx(signed.transaction).outputs;

    // The new tx spends the Taproot output
    const inputs = [{
      id: idForTx(signed.transaction),
      script: emptyScriptSig,
      sequence: defaultSequence,
      vout: spends.findIndex(n => n.tokens === tokens),
    }];

    // Make an output to pay back into the wallet
    const chainAddress = await createChainAddress({lnd});

    const {program} = decodeBech32Address({address: chainAddress.address});

    // Add output to the pay back transaction
    const outputs = [{
      script: bufferAsHex(p2wpkh(program)),
      tokens: smallTokens,
    }];

    // Make a new tx that will spend the output back into the wallet
    const unsigned = transactionFromComponents({
      inputs,
      outputs,
      locktime: defaultLocktime,
      version: defaultTxVersion,
    });

    const {signatures} = await signTransaction({
      lnd,
      inputs: [{
        key_family: 805,
        key_index: topLevelKey.index,
        output_script: output.script,
        output_tokens: tokens,
        root_hash: hash,
        sighash: transactionSighashDefault,
        vin: 0,
      }],
      transaction: unsigned.transaction,
    });

    const [signature] = signatures;

    // Add the signature to the input and serialize the signed transaction
    const {transaction} = transactionFromComponents({
      outputs,
      inputs: inputs.map(input => ({
        id: input.id,
        script: input.script,
        sequence: input.sequence,
        vout: input.vout,
        witness: [signature],
      })),
      locktime: defaultLocktime,
      version: defaultTxVersion,
    });

    await broadcastChainTransaction({lnd, transaction});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {utxos} = await getUtxos({lnd});

      const utxo = utxos.find(n => n.transaction_id === idForTx(transaction));

      if (!utxo || !utxo.confirmation_count) {
        throw new Error('ExpectedReceivedTaprootSpend');
      }
    });
  } catch (err) {
    console.log("ERR", err);
    await kill({});

    equal(err, null, 'Expected no error');
  }

  // A Taproot script can be funded and spent with bip86 internal key
  try {
    await generate({count});

    const topLevelKey = await getPublicKey({lnd, family: 805});

    const output = v1OutputScript({
      internal_key: topLevelKey.public_key,
    });

    const [utxo] = (await getUtxos({lnd})).utxos.reverse();

    // Make a PSBT paying to the Taproot output
    const {psbt} = createPsbt({
      outputs: [{tokens, script: output.script}],
      utxos: [{id: utxo.transaction_id, vout: utxo.transaction_vout}],
    });

    // Sign the PSBT
    const signed = await signPsbt({
      lnd,
      psbt: (await fundPsbt({lnd, psbt})).psbt,
    });

    // Send the tx to the chain
    await broadcastChainTransaction({lnd, transaction: signed.transaction});

    const spends = componentsOfTx(signed.transaction).outputs;

    // The new tx spends the Taproot output
    const inputs = [{
      id: idForTx(signed.transaction),
      script: emptyScriptSig,
      sequence: defaultSequence,
      vout: spends.findIndex(n => n.tokens === tokens),
    }];

    // Make an output to pay back into the wallet
    const chainAddress = await createChainAddress({lnd});

    const {program} = decodeBech32Address({address: chainAddress.address});

    // Add output to the pay back transaction
    const outputs = [{
      script: bufferAsHex(p2wpkh(program)),
      tokens: smallTokens,
    }];

    // Make a new tx that will spend the output back into the wallet
    const unsigned = transactionFromComponents({
      inputs,
      outputs,
      locktime: defaultLocktime,
      version: defaultTxVersion,
    });

    const {signatures} = await signTransaction({
      lnd,
      inputs: [{
        key_family: 805,
        key_index: topLevelKey.index,
        output_script: output.script,
        output_tokens: tokens,
        sighash: transactionSighashDefault,
        vin: 0,
      }],
      transaction: unsigned.transaction,
    });

    const [signature] = signatures;

    // Add the signature to the input and serialize the signed transaction
    const {transaction} = transactionFromComponents({
      outputs,
      inputs: inputs.map(input => ({
        id: input.id,
        script: input.script,
        sequence: input.sequence,
        vout: input.vout,
        witness: [signature],
      })),
      locktime: defaultLocktime,
      version: defaultTxVersion,
    });

    await broadcastChainTransaction({lnd, transaction});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {utxos} = await getUtxos({lnd});

      const utxo = utxos.find(n => n.transaction_id === idForTx(transaction));

      if (!utxo || !utxo.confirmation_count) {
        throw new Error('ExpectedReceivedTaprootSpend');
      }
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
