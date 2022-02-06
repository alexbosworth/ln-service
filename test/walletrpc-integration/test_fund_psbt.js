const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {createPsbt} = require('psbt');
const {crypto} = require('bitcoinjs-lib');
const {decodePsbt} = require('psbt');
const {networks} = require('bitcoinjs-lib');
const {script} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');
const tinysecp = require('tiny-secp256k1');
const {Transaction} = require('bitcoinjs-lib');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {sendToChainAddress} = require('./../../');
const {signPsbt} = require('./../../');

const chainAddressRowType = 'chain_address';
const {compile} = script;
const confirmationCount = 6;
const count = 100;
const description = 'description';
const extra = Buffer.alloc(32);
const {fromBech32} = address;
const {fromHex} = Transaction;
const {fromOutputScript} = address;
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const interval = retryCount => 10 * Math.pow(2, retryCount);
const isLowPublicKey = keyPair => keyPair.publicKey[0] === 2;
const makeTaprootKey = (k, h) => tinysecp.xOnlyPointAddTweak(k, h).xOnlyPubkey;
const nLess1 = 'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364140';
const one256BitBigEndian = '0000000000000000000000000000000000000000000000000000000000000001';
const OP_1 = 81;
const {privateAdd} = tinysecp;
const {privateSub} = tinysecp;
const regtestBech32AddressHrp = 'bcrt';
const shortKey = keyPair =>  keyPair.publicKey.slice(1, 33);
const {signSchnorr} = tinysecp;
const smallTokens = 2e5;
const tapHash = k => crypto.taggedHash('TapTweak', k.publicKey.slice(1, 33));
const times = 20;
const {toOutputScript} = address;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Funding a transaction should result in a funded PSBT
test(`Fund PSBT`, async ({end, equal}) => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

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

  // On LND 0.11.1 and below, funding a PSBT is not supported
  if (!funded) {
    await kill({});

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
  equal(change.tokens, 4998992950, 'Got change output value');

  equal(output.tokens, tokens, 'Got expected tokens output');

  const {data, version} = fromBech32(address);

  const prefix = `${Buffer.from([version]).toString('hex')}14`;

  const expectedOutput = `${prefix}${data.toString('hex')}`;

  equal(output.output_script, expectedOutput, 'Got expected output script');

  const decoded = decodePsbt({ecp, psbt: funded.psbt});

  const [decodedInput] = decoded.inputs;

  equal(decodedInput.sighash_type, 1, 'PSBT has sighash all flag');
  equal(!!decodedInput.witness_utxo.script_pub, true, 'PSBT input address');
  equal(decodedInput.witness_utxo.tokens, 5000000000, 'PSBT has input tokens');

  // A Taproot output should be funded
  try {
    await generate({count});

    const keyPair = ecp.makeRandom({network: networks.regtest});

    const outputKey = makeTaprootKey(shortKey(keyPair), tapHash(keyPair));
    const tweakHash = tapHash(keyPair);

    const outputScript = compile([OP_1, Buffer.from(outputKey)]);

    const [utxo] = (await getUtxos({lnd})).utxos.reverse();

    // Make a PSBT paying to the Taproot output
    const {psbt} = createPsbt({
      outputs: [{tokens, script: outputScript.toString('hex')}],
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
        [outputScript],
        [tokens],
        Transaction.SIGHASH_DEFAULT,
      );
    });

    const isLow = isLowPublicKey(keyPair);
    const ONE = hexAsBuffer(one256BitBigEndian);
    const subtract = privateSub(hexAsBuffer(nLess1), keyPair.privateKey);

    const privateKey = isLow ? keyPair.privateKey : privateAdd(subtract, ONE);

    // Only low keys are allowed to save a leading byte on the public key
    const lowPrivateKey = privateAdd(privateKey, tweakHash);

    const signature = signSchnorr(hashToSign, lowPrivateKey, extra);

    // Add the signature to the input
    tx.ins.forEach((input, i) => tx.setWitness(i, [Buffer.from(signature)]));

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
