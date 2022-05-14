const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {controlBlock} = require('p2tr');
const {createPsbt} = require('psbt');
const {hashForTree} = require('p2tr');
const {networks} = require('bitcoinjs-lib');
const {script} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');
const tinysecp = require('tiny-secp256k1');
const {Transaction} = require('bitcoinjs-lib');
const {v1OutputScript} = require('p2tr');

const {beginGroupSigningSession} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getPublicKey} = require('./../../');
const {getUtxos} = require('./../../');
const {signPsbt} = require('./../../');
const {signTransaction} = require('./../../');

const {compile} = script;
const count = 100;
const defaultInternalKey = '0350929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';
const {fromHex} = Transaction;
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const interval = retryCount => 10 * Math.pow(2, retryCount);
const OP_CHECKSIG = 172;
const smallTokens = 2e5;
const times = 20;
const {toOutputScript} = address;
const tokens = 1e6;

// Signing a taproot transaction should result in a valid signature
test(`Sign a taproot transaction`, async ({end, equal}) => {
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
    // On LND 0.14.3 and below, taproot signing is not supported
    if (err.slice().shift() === 501) {
      await kill({});

      return end();
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

    const branches = [{script: witnessScript.toString('hex')}];

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

    // Make a new tx that will spend the output back into the wallet
    const tx = new Transaction();

    // The new tx spends the Taproot output
    tx.addInput(
      fromHex(signed.transaction).getHash(),
      fromHex(signed.transaction).outs.findIndex(n => n.value === tokens)
    );

    // Make an output to pay back into the wallet
    const chainOutput = toOutputScript(
      (await createChainAddress({lnd})).address,
      networks.regtest
    );

    // Add output to the pay back transaction
    tx.addOutput(chainOutput, smallTokens);

    const {signatures} = await signTransaction({
      lnd,
      inputs: [{
        key_family: 805,
        key_index: scriptKey.index,
        output_script: output.script,
        output_tokens: tokens,
        root_hash: hash,
        sighash: Transaction.SIGHASH_DEFAULT,
        vin: 0,
        witness_script: witnessScript.toString('hex'),
      }],
      transaction: tx.toHex(),
    });

    const [signature] = signatures.map(hexAsBuffer);

    const {block} = controlBlock({
      external_key: output.external_key,
      leaf_script: witnessScript.toString('hex'),
      script_branches: branches,
    });

    // Add the signature to the input
    tx.ins.forEach((input, i) => {
      return tx.setWitness(i, [
        signature,
        witnessScript,
        hexAsBuffer(block),
      ]);
    });

    await broadcastChainTransaction({lnd, transaction: tx.toHex()});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {utxos} = await getUtxos({lnd});

      const utxo = utxos.find(n => n.transaction_id === tx.getId());

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

    const unusedKey = ecp.makeRandom({network: networks.regtest});

    const witnessScript = compile([unusedKey.publicKey.slice(1), OP_CHECKSIG]);

    const branches = [{script: witnessScript.toString('hex')}];

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

    // Make a new tx that will spend the output back into the wallet
    const tx = new Transaction();

    // The new tx spends the Taproot output
    tx.addInput(
      fromHex(signed.transaction).getHash(),
      fromHex(signed.transaction).outs.findIndex(n => n.value === tokens)
    );

    // Make an output to pay back into the wallet
    const chainOutput = toOutputScript(
      (await createChainAddress({lnd})).address,
      networks.regtest
    );

    // Add output to the pay back transaction
    tx.addOutput(chainOutput, smallTokens);

    const {signatures} = await signTransaction({
      lnd,
      inputs: [{
        key_family: 805,
        key_index: topLevelKey.index,
        output_script: output.script,
        output_tokens: tokens,
        root_hash: hash,
        sighash: Transaction.SIGHASH_DEFAULT,
        vin: 0,
      }],
      transaction: tx.toHex(),
    });

    const [signature] = signatures.map(hexAsBuffer);

    // Add the signature to the input
    tx.ins.forEach((input, i) => tx.setWitness(i, [signature]));

    await broadcastChainTransaction({lnd, transaction: tx.toHex()});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {utxos} = await getUtxos({lnd});

      const utxo = utxos.find(n => n.transaction_id === tx.getId());

      if (!utxo || !utxo.confirmation_count) {
        throw new Error('ExpectedReceivedTaprootSpend');
      }
    });
  } catch (err) {
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

    // Make a new tx that will spend the output back into the wallet
    const tx = new Transaction();

    // The new tx spends the Taproot output
    tx.addInput(
      fromHex(signed.transaction).getHash(),
      fromHex(signed.transaction).outs.findIndex(n => n.value === tokens)
    );

    // Make an output to pay back into the wallet
    const chainOutput = toOutputScript(
      (await createChainAddress({lnd})).address,
      networks.regtest
    );

    // Add output to the pay back transaction
    tx.addOutput(chainOutput, smallTokens);

    const {signatures} = await signTransaction({
      lnd,
      inputs: [{
        key_family: 805,
        key_index: topLevelKey.index,
        output_script: output.script,
        output_tokens: tokens,
        sighash: Transaction.SIGHASH_DEFAULT,
        vin: 0,
      }],
      transaction: tx.toHex(),
    });

    const [signature] = signatures.map(hexAsBuffer);

    // Add the signature to the input
    tx.ins.forEach((input, i) => tx.setWitness(i, [signature]));

    await broadcastChainTransaction({lnd, transaction: tx.toHex()});

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {utxos} = await getUtxos({lnd});

      const utxo = utxos.find(n => n.transaction_id === tx.getId());

      if (!utxo || !utxo.confirmation_count) {
        throw new Error('ExpectedReceivedTaprootSpend');
      }
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
