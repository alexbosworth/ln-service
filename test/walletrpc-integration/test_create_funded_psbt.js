const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {randomBytes} = require('node:crypto');
const {rejects} = require('node:assert').strict;
const test = require('node:test');

const asyncEach = require('async/each');
const asyncRetry = require('async/retry');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {decodeBase58Address} = require('@alexbosworth/blockchain');
const {decodeBech32Address} = require('@alexbosworth/blockchain');
const {decodePsbt} = require('psbt');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {createFundedPsbt} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getLockedUtxos} = require('./../../');
const {getUtxos} = require('./../../');
const {lockUtxo} = require('./../../');
const {partiallySignPsbt} = require('./../../');
const {signPsbt} = require('./../../');
const {unlockUtxo} = require('./../../');

const asOutpoint = n => `${n.transaction_id}:${n.transaction_vout}`;
const bufferAsHex = buffer => buffer.toString('hex');
const {concat} = Buffer;
const count = 100;
const format = 'p2tr';
const fromBase58 = address => decodeBase58Address({address}).hash;
const fromBech32 = address => decodeBech32Address({address}).program;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const lockId = randomBytes(32).toString('hex');
const OP_0 = Buffer.from([0]);
const OP_1 = Buffer.from([81]);
const OP_EQUAL = Buffer.from([135]);
const OP_HASH160 = Buffer.from([169]);
const push20 = Buffer.from([20]);
const push32 = Buffer.from([32]);
const sequence = 0;
const sighashAll = 1;
const size = 2;
const timelock = 1;
const times = 20;
const version = 1;

// Get the fee paid by a funded PSBT from the UTXO info of its inputs
const feeForPsbt = psbt => {
  const decoded = decodePsbt({psbt});

  const {outputs} = componentsOfTransaction({
    transaction: decoded.unsigned_transaction,
  });

  const spending = decoded.inputs.reduce((sum, input) => {
    return sum + input.witness_utxo.tokens;
  },
  0);

  return spending - outputs.reduce((sum, output) => sum + output.tokens, 0);
};

// Send tokens to output scripts using a funded PSBT
const sendToScripts = async ({lnd, outputs}) => {
  const {psbt} = await createFundedPsbt({
    lnd,
    outputs,
    fee_tokens_per_vbyte: 2,
  });

  const {transaction} = await signPsbt({lnd, psbt});

  return await broadcastChainTransaction({lnd, transaction});
};

// Release the locks on the inputs that were added to fund a PSBT
const unlockInputs = async ({inputs, lnd}) => {
  return await asyncEach(inputs.filter(n => !!n.lock_id), async input => {
    return await unlockUtxo({
      lnd,
      id: input.lock_id,
      transaction_id: input.transaction_id,
      transaction_vout: input.transaction_vout,
    });
  });
};

// Creating a funded PSBT should result in a funded PSBT
test(`Create funded PSBT`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

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

    const outputScriptElements = [OP_1, push32, fromBech32(address)];
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

    // The change output that was added is P2TR
    const [changeOutput] = signedTx.outputs.filter(n => n.tokens !== 500);

    equal(changeOutput.script.length, 68, 'Change output is P2TR');
    equal(changeOutput.script.slice(0, 4), '5120', 'Change output is v1');

    // The inputs and outputs of the funded PSBT are returned
    deepEqual(
      withChange.inputs.map(asOutpoint),
      signedTx.inputs.map(n => `${n.id}:${n.vout}`),
      'Got the inputs of the funded PSBT'
    );

    deepEqual(
      withChange.outputs,
      signedTx.outputs.map(n => ({
        is_change: n.tokens !== 500,
        output_script: n.script,
        tokens: n.tokens,
      })),
      'Got the outputs of the funded PSBT'
    );

    // Inputs added to fund the PSBT come back with their locks
    const locked = (await getLockedUtxos({lnd})).utxos;

    withChange.inputs.forEach(input => {
      const lock = locked.find(n => asOutpoint(n) === asOutpoint(input));

      equal(input.lock_id, lock.lock_id, 'Got the lock id of the input');
      equal(input.lock_expires_at, lock.lock_expires_at, 'Got lock expiry');
    });

    // The returned locks can release the inputs
    await unlockInputs({lnd, inputs: withChange.inputs});

    const unlocked = (await getLockedUtxos({lnd})).utxos;

    withChange.inputs.forEach(input => {
      const lock = unlocked.find(n => asOutpoint(n) === asOutpoint(input));

      equal(lock, undefined, 'The input lock is released');
    });

    // A fractional fee rate is used as it is instead of being rounded down
    const atWholeRate = await createFundedPsbt({
      lnd,
      fee_tokens_per_vbyte: 2,
      outputs: [{script: output, tokens: 500}],
    });

    await unlockInputs({lnd, inputs: atWholeRate.inputs});

    const atFractionalRate = await createFundedPsbt({
      lnd,
      fee_tokens_per_vbyte: 2.5,
      outputs: [{script: output, tokens: 500}],
    });

    await unlockInputs({lnd, inputs: atFractionalRate.inputs});

    const fractionalFee = feeForPsbt(atFractionalRate.psbt);
    const wholeFee = feeForPsbt(atWholeRate.psbt);

    equal(Math.round(fractionalFee / wholeFee * 100), 125, 'Got 2.5 sat/vB');

    // A 9,000 sat P2TR input at 30 sat/vB pays a 3,330 fee on 5,670 output
    const small = await createChainAddress({format, lnd});

    const smallScript = bufferAsHex(
      concat([OP_1, push32, fromBech32(small.address)])
    );

    await sendToScripts({lnd, outputs: [{script: smallScript, tokens: 9000}]});

    const smallUtxo = await asyncRetry({interval, times}, async () => {
      await generate({});

      const utxo = (await getUtxos({lnd})).utxos.find(n => n.tokens === 9000);

      if (!utxo) {
        throw new Error('ExpectedSmallUtxoToSpend');
      }

      return utxo;
    });

    await lockUtxo({
      lnd,
      transaction_id: smallUtxo.transaction_id,
      transaction_vout: smallUtxo.transaction_vout,
    });

    const sweep = {
      lnd,
      fee_tokens_per_vbyte: 30,
      inputs: [{
        transaction_id: smallUtxo.transaction_id,
        transaction_vout: smallUtxo.transaction_vout,
      }],
      outputs: [{script: output, tokens: 5670}],
    };

    // The 0.2 default max fee ratio of LND 0.21.4 and below rejects that fee
    await rejects(
      createFundedPsbt(sweep),
      [503, 'UnexpectedErrorCreatingFundedPsbt'],
      'Fee is over the default max fee ratio'
    );

    // A higher max fee ratio allows the fee
    const swept = await createFundedPsbt({...sweep, max_fee_ratio: 0.59});

    equal(feeForPsbt(swept.psbt), 3330, 'Fee is within the max fee ratio');
    equal(swept.inputs[0].lock_id, undefined, 'Specified input has no lock');

    deepEqual(
      swept.outputs,
      [{is_change: false, output_script: output, tokens: 5670}],
      'Got the output without change'
    );

    // A custom lock id and expiration apply to the inputs that get added
    const lockExpiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();

    const withLock = await createFundedPsbt({
      lnd,
      lock_expires_at: lockExpiresAt,
      lock_id: lockId,
      outputs: [{script: output, tokens: 500}],
    });

    const expiresAt = Date.parse(lockExpiresAt);

    withLock.inputs.forEach(input => {
      const skew = Math.abs(Date.parse(input.lock_expires_at) - expiresAt);

      equal(input.lock_id, lockId, 'Input is locked with the custom lock id');
      equal(skew < 1000 * 60, true, 'Input lock expires at the custom date');
    });

    await unlockInputs({lnd, inputs: withLock.inputs});

    // Inputs from another wallet can be funded with their UTXO and key info
    const p2wpkh = await createChainAddress({lnd: target.lnd});

    const np2wpkh = await createChainAddress({
      format: 'np2wpkh',
      lnd: target.lnd,
    });

    const p2tr = await createChainAddress({format, lnd: target.lnd});

    const targetScripts = [
      concat([OP_0, push20, fromBech32(p2wpkh.address)]),
      concat([OP_HASH160, push20, fromBase58(np2wpkh.address), OP_EQUAL]),
      concat([OP_1, push32, fromBech32(p2tr.address)]),
    ];

    const targetTokens = [20000, 30000, 40000];

    await sendToScripts({
      lnd,
      outputs: targetTokens.map((tokens, i) => ({
        tokens,
        script: bufferAsHex(targetScripts[i]),
      })),
    });

    const targetUtxos = await asyncRetry({interval, times}, async () => {
      await generate({});

      const received = (await getUtxos({lnd: target.lnd})).utxos;

      if (received.length !== targetTokens.length) {
        throw new Error('ExpectedTargetUtxosToSpend');
      }

      return targetTokens.map(n => received.find(utxo => utxo.tokens === n));
    });

    const [, , p2trUtxo] = targetUtxos;

    // Get the BIP 32 derivation of the P2TR key from the target wallet
    const targetFunded = await fundPsbt({
      inputs: [{
        transaction_id: p2trUtxo.transaction_id,
        transaction_vout: p2trUtxo.transaction_vout,
      }],
      lnd: target.lnd,
      outputs: [{address: p2wpkh.address, tokens: 10000}],
    });

    await unlockInputs({inputs: targetFunded.inputs, lnd: target.lnd});

    const p2trVin = targetFunded.inputs.findIndex(n => {
      return asOutpoint(n) === asOutpoint(p2trUtxo);
    });

    const {inputs} = decodePsbt({psbt: targetFunded.psbt});

    // LND 0.21.4 and below need the x-only key derivation to size P2TR inputs
    const taprootDerivations = inputs[p2trVin].bip32_derivations
      .filter(n => n.public_key.length === 64);

    const targetInputs = targetUtxos.map(utxo => ({
      bip32_derivations: utxo === p2trUtxo ? taprootDerivations : undefined,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
      witness_utxo: {output_script: utxo.output_script, tokens: utxo.tokens},
    }));

    const withTarget = await createFundedPsbt({
      lnd,
      fee_tokens_per_vbyte: 2,
      inputs: targetInputs,
      outputs: [{script: output, tokens: 100000}],
    });

    const fromTarget = withTarget.inputs.slice(0, targetInputs.length);
    const addedInputs = withTarget.inputs.slice(targetInputs.length);

    deepEqual(
      fromTarget.map(asOutpoint),
      targetInputs.map(asOutpoint),
      'Got the inputs from target'
    );

    equal(fromTarget.every(n => !n.lock_id), true, 'Target inputs not locked');
    equal(!!addedInputs.length, true, 'Inputs were added to fund the PSBT');
    equal(addedInputs.every(n => !!n.lock_id), true, 'Added inputs locked');

    // The P2WPKH and nested P2WPKH inputs from target use SIGHASH_ALL
    const sighashTypes = decodePsbt({psbt: withTarget.psbt}).inputs
      .slice(0, targetInputs.length)
      .map(n => n.sighash_type);

    deepEqual(
      sighashTypes,
      [sighashAll, sighashAll, undefined],
      'Got the sighash types of the inputs from target'
    );

    // Each wallet signs its own inputs
    const partial = await partiallySignPsbt({lnd, psbt: withTarget.psbt});

    const signedWithTarget = await signPsbt({
      lnd: target.lnd,
      psbt: partial.psbt,
    });

    const published = await broadcastChainTransaction({
      lnd: target.lnd,
      transaction: signedWithTarget.transaction,
    });

    // The transaction spending inputs from both wallets confirms
    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {transactions} = await getChainTransactions({lnd: target.lnd});

      const tx = transactions.find(n => n.id === published.id);

      if (!tx || !tx.is_confirmed) {
        throw new Error('ExpectedConfirmedTransactionWithTargetInputs');
      }
    });
  } catch (err) {
    await kill({});

    equal(err, null, 'No error expected');
  }

  await kill({});

  return;
});
