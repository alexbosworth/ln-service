const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {controlBlock} = require('p2tr');
const {createPsbt} = require('psbt');
const {hashForTree} = require('p2tr');
const {leafHash} = require('p2tr');
const {networks} = require('bitcoinjs-lib');
const {script} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');
const {Transaction} = require('bitcoinjs-lib');
const {v1OutputScript} = require('p2tr');

const {beginGroupSigningSession} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {endGroupSigningSession} = require('./../../');
const {fundPsbt} = require('./../../');
const {getPublicKey} = require('./../../');
const {getUtxos} = require('./../../');
const {signPsbt} = require('./../../');
const {updateGroupSigningSession} = require('./../../');

const {compile} = script;
const count = 100;
const defaultInternalKey = '0350929b74c1a04954b78b4b6035e97a5e078a5a0f28ec96d547bfee9ace803ac0';
const {from} = Buffer;
const {fromHex} = Transaction;
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const interval = 100;
const OP_CHECKSIG = 172;
const smallTokens = 2e5;
const times = 20;
const {toOutputScript} = address;
const tokens = 1e6;

// Starting a group signing session should result in a new MuSig2 session
test(`Begin group signing session`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size: 2});

  const [{generate, lnd}, target] = nodes;

  try {
    await beginGroupSigningSession({
      lnd,
      is_key_spend: true,
      key_family: 0,
      key_index: 0,
      public_keys: [Buffer.alloc(33, 2).toString('hex')],
    });
  } catch (err) {
    // On LND 0.14.3 and below, group signing is not supported
    if (err.slice().shift() === 501) {
      await kill({});

      return end();
    }

    throw err;
  }

  // A Taproot script can be funded and spent with MuSig2
  try {
    await generate({count});

    const controlKey = await getPublicKey({lnd, family: 0});
    const targetKey = await getPublicKey({family: 0, lnd: target.lnd});

    const controlGroup = await beginGroupSigningSession({
      lnd,
      is_key_spend: true,
      key_family: 0,
      key_index: controlKey.index,
      public_keys: [targetKey.public_key],
    });

    const targetGroup = await beginGroupSigningSession({
      is_key_spend: true,
      key_family: 0,
      key_index: targetKey.index,
      lnd: target.lnd,
      public_keys: [controlKey.public_key],
    });

    equal(controlGroup.external_key, targetGroup.external_key, 'Equal e-keys');
    equal(controlGroup.internal_key, targetGroup.internal_key, 'Equal i-keys');

    const script = Buffer.concat([
      Buffer.from([81]),
      Buffer.from([32]),
      hexAsBuffer(controlGroup.external_key),
    ]);

    const [utxo] = (await getUtxos({lnd})).utxos.reverse();

    // Make a PSBT paying to the Taproot output
    const {psbt} = createPsbt({
      outputs: [{tokens, script: script.toString('hex')}],
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

    const [hashToSign] = tx.ins.map((input, i) => {
      return tx.hashForWitnessV1(
        i,
        [script],
        [tokens],
        Transaction.SIGHASH_DEFAULT,
      );
    });

    const controlSign = await updateGroupSigningSession({
      lnd,
      hash: hashToSign.toString('hex'),
      id: controlGroup.id,
      nonces: [targetGroup.nonce],
    });

    const targetSign = await updateGroupSigningSession({
      hash: hashToSign.toString('hex'),
      id: targetGroup.id,
      lnd: target.lnd,
      nonces: [controlGroup.nonce],
    });

    await endGroupSigningSession({lnd: target.lnd, id: targetGroup.id});

    const {signature} = await endGroupSigningSession({
      lnd,
      id: controlGroup.id,
      signatures: [targetSign.signature],
    });

    // Add the signature to the input
    tx.ins.forEach((input, i) => tx.setWitness(i, [hexAsBuffer(signature)]));

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

  // A Taproot script can be funded and spent with MuSig2 for a script output
  try {
    await generate({count});

    const controlKey = await getPublicKey({lnd, family: 0});
    const targetKey = await getPublicKey({family: 0, lnd: target.lnd});
    const unusedKey = (await getPublicKey({lnd, family: 805})).public_key;

    const xOnlyUnused = hexAsBuffer(unusedKey.slice(2));

    const witnessScript = compile([xOnlyUnused, OP_CHECKSIG]);

    const branches = [{script: witnessScript.toString('hex')}];

    const {hash} = hashForTree({branches});

    const controlGroup = await beginGroupSigningSession({
      lnd,
      key_family: 0,
      key_index: controlKey.index,
      public_keys: [targetKey.public_key],
      root_hash: hash,
    });

    const targetGroup = await beginGroupSigningSession({
      key_family: 0,
      key_index: targetKey.index,
      lnd: target.lnd,
      public_keys: [controlKey.public_key],
      root_hash: hash,
    });

    equal(controlGroup.external_key, targetGroup.external_key, 'Equal e-keys');
    equal(controlGroup.internal_key, targetGroup.internal_key, 'Equal i-keys');

    const script = Buffer.concat([
      from([81]),
      from([32]),
      hexAsBuffer(controlGroup.external_key),
    ]);

    const [utxo] = (await getUtxos({lnd})).utxos.reverse();

    // Make a PSBT paying to the Taproot output
    const {psbt} = createPsbt({
      outputs: [{tokens, script: script.toString('hex')}],
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

    const [hashToSign] = tx.ins.map((input, i) => {
      return tx.hashForWitnessV1(
        i,
        [script],
        [tokens],
        Transaction.SIGHASH_DEFAULT,
      );
    });

    const controlSign = await updateGroupSigningSession({
      lnd,
      hash: hashToSign.toString('hex'),
      id: controlGroup.id,
      nonces: [targetGroup.nonce],
    });

    const targetSign = await updateGroupSigningSession({
      hash: hashToSign.toString('hex'),
      id: targetGroup.id,
      lnd: target.lnd,
      nonces: [controlGroup.nonce],
    });

    await endGroupSigningSession({lnd: target.lnd, id: targetGroup.id});

    const {signature} = await endGroupSigningSession({
      lnd,
      id: controlGroup.id,
      signatures: [targetSign.signature],
    });

    // Add the signature to the input
    tx.ins.forEach((input, i) => tx.setWitness(i, [hexAsBuffer(signature)]));

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

  // A Taproot script can be funded and spent on the script path
  try {
    await generate({count});

    const controlKey = await getPublicKey({lnd, family: 0});
    const targetKey = await getPublicKey({family: 0, lnd: target.lnd});

    const controlGroup = await beginGroupSigningSession({
      lnd,
      key_family: 0,
      key_index: controlKey.index,
      public_keys: [targetKey.public_key],
    });

    const targetGroup = await beginGroupSigningSession({
      key_family: 0,
      key_index: targetKey.index,
      lnd: target.lnd,
      public_keys: [controlKey.public_key],
    });

    const scriptKey = hexAsBuffer(controlGroup.external_key);

    const witnessScript = compile([scriptKey, OP_CHECKSIG]);

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

    const [hashToSign] = tx.ins.map((input, i) => {
      return tx.hashForWitnessV1(
        i,
        [hexAsBuffer(output.script)],
        [tokens],
        Transaction.SIGHASH_DEFAULT,
        hexAsBuffer(leafHash({script: witnessScript.toString('hex')}).hash),
      );
    });

    const controlSign = await updateGroupSigningSession({
      lnd,
      hash: hashToSign.toString('hex'),
      id: controlGroup.id,
      nonces: [targetGroup.nonce],
    });

    const targetSign = await updateGroupSigningSession({
      hash: hashToSign.toString('hex'),
      id: targetGroup.id,
      lnd: target.lnd,
      nonces: [controlGroup.nonce],
    });

    await endGroupSigningSession({lnd: target.lnd, id: targetGroup.id});

    const {signature} = await endGroupSigningSession({
      lnd,
      id: controlGroup.id,
      signatures: [targetSign.signature],
    });

    const {block} = controlBlock({
      external_key: output.external_key,
      leaf_script: witnessScript.toString('hex'),
      script_branches: branches,
    });

    // Add the signature to the input
    tx.ins.forEach((input, i) => {
      return tx.setWitness(i, [
        hexAsBuffer(signature),
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

  await kill({});

  return end();
});
