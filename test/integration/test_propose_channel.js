const {ok} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {createPsbt} = require('psbt');
const {combinePsbts} = require('psbt');
const {decodePsbt} = require('psbt');
const {extractTransaction} = require('psbt');
const {finalizePsbt} = require('psbt');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');
const {script} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const tinysecp = require('tiny-secp256k1');
const {Transaction} = require('bitcoinjs-lib');
const {updatePsbt} = require('psbt');

const {addPeer} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getPublicKey} = require('./../../');
const {getWalletInfo} = require('./../../');
const {prepareForChannelProposal} = require('./../../');
const {proposeChannel} = require('./../../');
const {signPsbt} = require('./../../');
const {signTransaction} = require('./../../');

const capacity = 1e6;
const {ceil} = Math;
const cooperativeCloseDelay = 2016;
const family = 0;
const feeRate = 1;
const {fromHex} = Transaction;
const fundingFee = 190; // Vsize of 2 input, 1 output tx
const interval = 100;
const keyIndex = 0;
const network = 'regtest';
const {p2ms} = payments;
const {p2pkh} = payments;
const {regtest} = networks;
const reserveRatio = 0.01;
const size = 2;
const temporaryFamily = 805;
const times = 300;

// Proposing a cooperative delay channel should open a cooperative delay chan
test(`Propose a channel with a coop delay`, async () => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);

  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd, generate} = control;

  try {
    // Generate some funds for LND
    await asyncRetry({times}, async () => {
      await generate({});

      await addPeer({lnd, public_key: target.id, socket: target.socket});

      await generate({});

      const wallet = await getChainBalance({lnd});

      if (!wallet.chain_balance) {
        throw new Error('ExpectedChainBalanceForNode');
      }
    });

    // Generate some funds for LND
    await asyncRetry({times}, async () => {
      await target.generate({});

      const wallet = await getChainBalance({lnd: target.lnd});

      if (!wallet.chain_balance) {
        throw new Error('ExpectedChainBalanceForNode');
      }
    });

    const {features} = await getWalletInfo({lnd});

    // Derive a temporary key for control to pay into
    const controlDerivedKey = await getPublicKey({
      lnd,
      family: temporaryFamily,
    });

    // Derive a temporary key for target to pay into
    const targetDerivedKey = await getPublicKey({
      family: temporaryFamily,
      lnd: target.lnd,
    });

    // Control should fund and sign a transaction going to the control temp key
    const controlDerivedAddress = payments.p2wpkh({
      network: regtest,
      pubkey: Buffer.from(controlDerivedKey.public_key, 'hex'),
    });

    // Target should fund and sign a transaction going to the target temp key
    const targetDerivedAddress = payments.p2wpkh({
      network: regtest,
      pubkey: Buffer.from(targetDerivedKey.public_key, 'hex'),
    });

    const temporaryKeys = [controlDerivedKey, targetDerivedKey];

    const giveTokens = ceil(capacity / temporaryKeys.length);

    // Control can now fund a transaction to pay to the temp address
    const controlFundPsbt = await fundPsbt({
      lnd,
      fee_tokens_per_vbyte: feeRate,
      outputs: [{
        address: controlDerivedAddress.address,
        tokens: giveTokens + ceil(fundingFee / temporaryKeys.length),
      }],
    });

    // Target can now fund a transaction to pay to the temp address
    const targetFundPsbt = await fundPsbt({
      lnd: target.lnd,
      fee_tokens_per_vbyte: feeRate,
      outputs: [{
        address: targetDerivedAddress.address,
        tokens: giveTokens + ceil(fundingFee / temporaryKeys.length),
      }],
    });

    // Control can sign the funding to the temporary address
    const controlSignPsbt = await signPsbt({lnd, psbt: controlFundPsbt.psbt});

    // Target can sign the funding to the temporary address
    const targetSignPsbt = await signPsbt({
      lnd: target.lnd,
      psbt: targetFundPsbt.psbt,
    });

    // Decode the control funded PSBT
    const controlPsbt = decodePsbt({ecp, psbt: controlFundPsbt.psbt});

    // Decode the target funded PSBT
    const targetPsbt = decodePsbt({ecp, psbt: targetFundPsbt.psbt});

    // Derive the id of the control pre-funding tx
    const controlId = fromHex(controlPsbt.unsigned_transaction).getId();

    // Derive the id of the target pre-funding tx
    const targetId = fromHex(targetPsbt.unsigned_transaction).getId();

    // Derive a new control key for a 2:2 multisig
    const controlMultiSigKey = await getPublicKey({family, lnd});

    // Derive a new target key for a 2:2 multisig
    const targetMultiSigKey = await getPublicKey({family, lnd: target.lnd});

    const fundingMultiSigKeys = [
      controlMultiSigKey.public_key,
      targetMultiSigKey.public_key,
    ];

    // Make the channel 2:2 funding output from control and target keys
    const dualFundingChannelAddress = payments.p2wsh({
      redeem: p2ms({
        m: fundingMultiSigKeys.length,
        pubkeys: fundingMultiSigKeys.sort().map(n => Buffer.from(n, 'hex')),
      }),
    });

    const pendingChannelId = dualFundingChannelAddress.hash;

    // Create the basic PSBT that spends temporary funds to the 2:2 funding
    const dualFundPsbt = createPsbt({
      outputs: [{
        script: dualFundingChannelAddress.output.toString('hex'),
        tokens: capacity,
      }],
      utxos: [
        {
          id: fromHex(controlSignPsbt.transaction).getId(),
          vout: controlFundPsbt.outputs.findIndex(n => !n.is_change),
        },
        {
          id: fromHex(targetSignPsbt.transaction).getId(),
          vout: targetFundPsbt.outputs.findIndex(n => !n.is_change),
        },
      ],
    });

    const controlWithoutWitnessTx = fromHex(controlSignPsbt.transaction);
    const targetWithoutWitnessTx = fromHex(targetSignPsbt.transaction);

    // Eliminate the witnesses
    controlWithoutWitnessTx.ins.forEach((input, index) => {
      return controlWithoutWitnessTx.setWitness(index, []);
    });

    targetWithoutWitnessTx.ins.forEach((input, index) => {
      return targetWithoutWitnessTx.setWitness(index, []);
    });

    // Add the spending transactions to the psbt
    const psbtWithSpending = updatePsbt({
      ecp,
      psbt: dualFundPsbt.psbt,
      transactions: [
        controlWithoutWitnessTx.toHex(),
        targetWithoutWitnessTx.toHex(),
      ],
    });

    const finalFundingPsbt = decodePsbt({ecp, psbt: dualFundPsbt.psbt});

    const fundingTx = fromHex(finalFundingPsbt.unsigned_transaction);

    const fundingTxId = fundingTx.getId();

    const fundingTxVout = fundingTx.outs.findIndex(n => n.value === capacity);

    const controlTxHash = controlWithoutWitnessTx.getHash();

    const targetTxHash = targetWithoutWitnessTx.getHash();

    const controlVin = fundingTx.ins.findIndex(({hash}) => {
      return hash.equals(controlTxHash);
    });

    const targetVin = fundingTx.ins.findIndex(({hash}) => {
      return hash.equals(targetTxHash);
    });

    const decodePayout = decodePsbt({ecp, psbt: psbtWithSpending.psbt});

    // Call signTransaction on the unsigned tx that pays from temp -> multisig
    const controlSignDerivedKey = await signTransaction({
      lnd,
      inputs: [{
        key_family: temporaryFamily,
        key_index: controlDerivedKey.index,
        output_script: dualFundingChannelAddress.output.toString('hex'),
        output_tokens: giveTokens + ceil(fundingFee / temporaryKeys.length),
        sighash: Transaction.SIGHASH_ALL,
        vin: controlVin,
        witness_script: p2pkh({hash: controlDerivedAddress.hash}).output,
      }],
      transaction: decodePayout.unsigned_transaction,
    });

    const [controlDerivedSignature] = controlSignDerivedKey.signatures;

    const controlSignSpendingPsbt = updatePsbt({
      ecp,
      psbt: psbtWithSpending.psbt,
      signatures: controlSignDerivedKey.signatures.map(sig => {
        return {
          signature: Buffer.concat([
            Buffer.from(sig, 'hex'),
            Buffer.from([Transaction.SIGHASH_ALL]),
          ]).toString('hex') ,
          hash_type: Transaction.SIGHASH_ALL,
          public_key: controlDerivedKey.public_key,
          vin: controlVin,
        };
      }),
    });

    // Call signTransaction on the unsigned tx that pays from temp -> multisig
    const targetSignDerivedKey = await signTransaction({
      inputs: [{
        key_family: temporaryFamily,
        key_index: targetDerivedKey.index,
        output_script: dualFundingChannelAddress.output.toString('hex'),
        output_tokens: giveTokens + ceil(fundingFee / temporaryKeys.length),
        sighash: Transaction.SIGHASH_ALL,
        vin: targetVin,
        witness_script: p2pkh({hash: targetDerivedAddress.hash}).output,
      }],
      lnd: target.lnd,
      transaction: decodePsbt({
        ecp,
        psbt: psbtWithSpending.psbt,
      }).unsigned_transaction,
    });

    const [targetDerivedSignature] = targetSignDerivedKey.signatures;

    const targetSignSpendingPsbt = updatePsbt({
      ecp,
      psbt: psbtWithSpending.psbt,
      signatures: targetSignDerivedKey.signatures.map(sig => {
        return {
          signature: Buffer.concat([
            Buffer.from(sig, 'hex'),
            Buffer.from([Transaction.SIGHASH_ALL]),
          ]).toString('hex') ,
          hash_type: Transaction.SIGHASH_ALL,
          public_key: targetDerivedKey.public_key,
          vin: targetVin,
        };
      }),
    });

    // Use the anticipated funding tx to prepare for a new channel open
    await prepareForChannelProposal({
      cooperative_close_delay: cooperativeCloseDelay,
      id: pendingChannelId.toString('hex'),
      key_index: targetMultiSigKey.index,
      lnd: target.lnd,
      remote_key: controlMultiSigKey.public_key,
      transaction_id: fundingTxId,
      transaction_vout: fundingTxVout,
    });

    const coopCloseAddress = await createChainAddress({
      format: 'p2wpkh',
      lnd: control.lnd,
    });

    // Propose the channel to the target
    await proposeChannel({
      capacity,
      cooperative_close_address: coopCloseAddress.address,
      cooperative_close_delay: cooperativeCloseDelay,
      give_tokens: capacity / fundingMultiSigKeys.length,
      id: pendingChannelId.toString('hex'),
      is_private: true,
      key_index: controlMultiSigKey.index,
      lnd: control.lnd,
      partner_public_key: target.id,
      remote_key: targetMultiSigKey.public_key,
      transaction_id: fundingTxId,
      transaction_vout: fundingTxVout,
    });

    const pendingTarget = await getPendingChannels({lnd: target.lnd});

    const [incoming] = pendingTarget.pending_channels;

    strictEqual(incoming.remote_balance, 496530, 'Remote balance amount');
    strictEqual(incoming.transaction_fee, 2810, 'Commit tx fee');
    strictEqual(incoming.transaction_weight, 1116, 'Funding tx weight');

    strictEqual(incoming.capacity, 1000000, 'Incoming capacity is defined');
    strictEqual(incoming.close_transaction_id, undefined, 'Not a closing tx');
    strictEqual(incoming.is_active, false, 'Not active yet');
    strictEqual(incoming.is_closing, false, 'Channel is not closing');
    strictEqual(incoming.is_opening, true, 'Channel is opening');
    strictEqual(incoming.is_partner_initiated, true, 'Peer initiated channel');
    strictEqual(incoming.local_balance, giveTokens, 'The incoming is split');
    strictEqual(incoming.local_reserve, capacity * reserveRatio, 'Reserve');
    strictEqual(incoming.partner_public_key, control.id, 'Peer key');
    strictEqual(incoming.pending_balance, undefined, 'No tokens pending');
    strictEqual(incoming.pending_payments, undefined, 'No HTLCs active');
    strictEqual(incoming.received, 0, 'Nothing received');
    strictEqual(incoming.recovered_tokens, undefined, 'No recovery');
    strictEqual(incoming.remote_reserve, capacity * reserveRatio, 'Reserve');
    strictEqual(incoming.sent, 0, 'Nothing sent');
    strictEqual(incoming.timelock_expiration, undefined, 'No timelock');
    strictEqual(incoming.transaction_id, fundingTxId, 'Funding tx id correct');
    strictEqual(incoming.transaction_vout, fundingTxVout, 'Funding vout');

    // Setup the combined signed PSBTs that fund the channel
    const combinedTempPsbt = combinePsbts({
      ecp,
      psbts: [
        controlSignSpendingPsbt,
        targetSignSpendingPsbt,
      ].map(n => n.psbt),
    });

    // Finalize the combined PSBT
    const finalTempPsbt = finalizePsbt({ecp, psbt: combinedTempPsbt.psbt});

    // Pull out the signed broadcast-ready transaction from the PSBT
    const finalTempTx = extractTransaction({ecp, psbt: finalTempPsbt.psbt});

    // Calculate the size of the tx
    const txSize = fromHex(finalTempTx.transaction).virtualSize();

    strictEqual(txSize <= fundingFee, true, 'Transaction size is not large');

    // Broadcast the transaction to fund the control side
    await broadcastChainTransaction({
      lnd,
      transaction: controlSignPsbt.transaction,
    });

    // Broadcast the transaction to fund the target side
    await broadcastChainTransaction({
      lnd,
      transaction: targetSignPsbt.transaction,
    });

    // Broadcast the transaction to fund the channel
    await broadcastChainTransaction({
      lnd,
      transaction: finalTempTx.transaction,
    });

    // Mine the funding transactions into a block
    await asyncRetry({interval, times}, async () => {
      await control.generate({});

      const {channels} = await getChannels({lnd});

      if (!channels.find(n => n.is_active)) {
        throw new Error('ExpectedActiveChannel');
      }

      return;
    });

    const controlChannels = await getChannels({lnd});

    const [controlChannel] = controlChannels.channels;

    const closeAddr = coopCloseAddress.address;

    strictEqual(controlChannel.commit_transaction_fee, 2810, 'Regular tx fee');
    strictEqual(controlChannel.commit_transaction_weight, 1116, 'Regular tx');

    strictEqual(controlChannel.capacity, capacity, 'Channel with capacity');
    strictEqual(controlChannel.cooperative_close_address, closeAddr, 'Addr');
    strictEqual(!!controlChannel.cooperative_close_delay_height, true, 'Thaw');
    strictEqual(!!controlChannel.id, true, 'Got channel id');
    strictEqual(controlChannel.is_active, true, 'Channel is active and ready');
    strictEqual(controlChannel.is_closing, false, 'Channel is not closing');
    strictEqual(controlChannel.is_opening, false, 'Channel is already opened');
    strictEqual(controlChannel.is_partner_initiated, false, 'Control opened');
    strictEqual(controlChannel.is_private, true, 'Channel is private');
    strictEqual(controlChannel.local_balance, incoming.remote_balance, 'Toks');
    strictEqual(controlChannel.local_csv, 144, 'Channel CSV');
    ok(controlChannel.local_dust >= 354, 'Channel dust');
    strictEqual(controlChannel.local_given, giveTokens, 'Gave Channel tokens');
    strictEqual(controlChannel.local_max_htlcs, 483, 'Channel HTLCs max set');
    strictEqual(controlChannel.partner_public_key, target.id, 'R-key');
    strictEqual(controlChannel.transaction_id, fundingTxId, 'Funding tx id');
    strictEqual(controlChannel.transaction_vout, fundingTxVout, 'Tx vout');

    const targetChannels = await getChannels({lnd: target.lnd});

    const [targetChannel] = targetChannels.channels;

    strictEqual(targetChannel.commit_transaction_fee, 2810, 'Regular tx fee');
    strictEqual(targetChannel.commit_transaction_weight, 1116, 'Regular size');

    strictEqual(targetChannel.capacity, capacity, 'Channel with capacity');
    strictEqual(targetChannel.cooperative_close_address, undefined, 'No addr');
    strictEqual(!!targetChannel.cooperative_close_delay_height, true, 'Thaw');
    strictEqual(!!targetChannel.id, true, 'Got channel id');
    strictEqual(targetChannel.is_active, true, 'Channel is active and ready');
    strictEqual(targetChannel.is_closing, false, 'Channel is not closing');
    strictEqual(targetChannel.is_opening, false, 'Channel is already opened');
    strictEqual(targetChannel.is_partner_initiated, true, 'Control opened');
    strictEqual(targetChannel.is_private, true, 'Channel is private');
    strictEqual(targetChannel.local_balance, giveTokens, 'Target tokens');
    strictEqual(targetChannel.local_csv, 144, 'Channel CSV');
    ok(targetChannel.local_dust >= 354, 'Channel dust');
    strictEqual(targetChannel.local_given, 0, 'No tokens given');
    strictEqual(targetChannel.local_max_htlcs, 483, 'Channel HTLCs max set');
    strictEqual(targetChannel.partner_public_key, control.id, 'R-key');
    strictEqual(targetChannel.transaction_id, fundingTxId, 'Funding tx id');
    strictEqual(targetChannel.transaction_vout, fundingTxVout, 'Tx vout');
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
