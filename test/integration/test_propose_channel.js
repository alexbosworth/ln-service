const {randomBytes} = require('crypto');

const {address} = require('bitcoinjs-lib');
const asyncRetry = require('async/retry');
const {createPsbt} = require('psbt');
const {combinePsbts} = require('psbt');
const {decodePsbt} = require('psbt');
const {ECPair} = require('bitcoinjs-lib');
const {extractTransaction} = require('psbt');
const {finalizePsbt} = require('psbt');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');
const signPsbtWithKey = require('psbt').signPsbt;
const {test} = require('tap');
const {Transaction} = require('bitcoinjs-lib');
const {updatePsbt} = require('psbt');
const wif = require('wif');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {fundPsbt} = require('./../../');
const {getChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getPublicKey} = require('./../../');
const {getWalletVersion} = require('./../../');
const {prepareForChannelProposal} = require('./../../');
const {proposeChannel} = require('./../../');
const {signPsbt} = require('./../../');

const capacity = 1e6;
const {ceil} = Math;
const cooperativeCloseDelay = 2016;
const family = 0;
const feeRate = 1;
const {fromHex} = Transaction;
const {fromOutputScript} = address;
const fundingFee = 190; // Vsize of 2 input, 1 output tx
const id = randomBytes(32).toString('hex');
const interval = 100;
const keyIndex = 0;
const makeId = () => randomBytes(32);
const {makeRandom} = ECPair;
const network = 'regtest';
const {p2ms} = payments;
const {p2pkh} = payments;
const {regtest} = networks;
const reserveRatio = 0.01;
const times = 100;

// Proposing a cooperative delay channel should open a cooperative delay chan
test(`Propose a channel with a cooperative delay`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {version} = await getWalletVersion({lnd: cluster.control.lnd});

  switch (version) {
  case '0.11.0-beta':
  case '0.11.1-beta':
    // Exit early when funding PSBTs is not supported
    await cluster.kill({});
    return end();
    break;

  default:
    break;
  }

  // Create an id for the pending channel
  const pendingChannelId = makeId();

  // Make control a temporary key
  const controlTempKey = makeRandom({network: regtest});

  // Make target a temporary key
  const targetTempKey = makeRandom({network: regtest});

  // Control should fund and sign a transaction going to the control temp key
  const controlTempAddress = payments.p2wpkh({
    network: regtest,
    pubkey: controlTempKey.publicKey,
  });

  // Target should fund and sign a transaction going to the target temp key
  const targetTempAddress = payments.p2wpkh({
    network: regtest,
    pubkey: targetTempKey.publicKey,
  });

  const temporaryKeys = [controlTempKey, targetTempKey];

  const giveTokens = ceil(capacity / temporaryKeys.length);

  // Control can now fund a transaction to pay to the temp address
  const controlFundPsbt = await fundPsbt({
    lnd: cluster.control.lnd,
    fee_tokens_per_vbyte: feeRate,
    outputs: [{
      address: controlTempAddress.address,
      tokens: giveTokens + ceil(fundingFee / temporaryKeys.length),
    }],
  });

  // Target can now fund a transaction to pay to the temp address
  const targetFundPsbt = await fundPsbt({
    lnd: cluster.target.lnd,
    fee_tokens_per_vbyte: feeRate,
    outputs: [{
      address: targetTempAddress.address,
      tokens: giveTokens + ceil(fundingFee / temporaryKeys.length),
    }],
  });

  // Control can sign the funding to the temporary address
  const controlSignPsbt = await signPsbt({
    lnd: cluster.control.lnd,
    psbt: controlFundPsbt.psbt,
  });

  // Target can sign the funding to the temporary address
  const targetSignPsbt = await signPsbt({
    lnd: cluster.target.lnd,
    psbt: targetFundPsbt.psbt,
  });

  // Decode the control funded PSBT
  const controlPsbt = decodePsbt({psbt: controlFundPsbt.psbt});

  // Decode the target funded PSBT
  const targetPsbt = decodePsbt({psbt: targetFundPsbt.psbt});

  // Derive the id of the control pre-funding tx
  const controlId = fromHex(controlPsbt.unsigned_transaction).getId();

  // Derive the id of the target pre-funding tx
  const targetId = fromHex(targetPsbt.unsigned_transaction).getId();

  // Derive a new control key for a 2:2 multisig
  const controlMultiSigKey = await getPublicKey({
    family,
    lnd: cluster.control.lnd,
  });

  // Derive a new target key for a 2:2 multisig
  const targetMultiSigKey = await getPublicKey({
    family,
    lnd: cluster.target.lnd,
  });

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
    psbt: dualFundPsbt.psbt,
    transactions: [
      controlWithoutWitnessTx.toHex(),
      targetWithoutWitnessTx.toHex(),
    ],
  });

  const finalFundingPsbt =  decodePsbt({psbt: dualFundPsbt.psbt});

  const fundingTx = fromHex(finalFundingPsbt.unsigned_transaction);

  const fundingTxId = fundingTx.getId();

  const fundingTxVout = fundingTx.outs.findIndex(n => n.value === capacity);

  // Use the control temporary key to sign the channel funding PSBT
  const controlSignTempPsbt = signPsbtWithKey({
    network,
    psbt: psbtWithSpending.psbt,
    signing_keys: [wif.encode(regtest.wif, controlTempKey.privateKey, true)],
  });

  // Use the target temporary key to sign the channel funding PSBT
  const targetSignTempPsbt = signPsbtWithKey({
    network,
    psbt: psbtWithSpending.psbt,
    signing_keys: [wif.encode(regtest.wif, targetTempKey.privateKey, true)],
  });

  // Use the anticipated funding tx to prepare for a new channel open
  await prepareForChannelProposal({
    cooperative_close_delay: cooperativeCloseDelay,
    id: pendingChannelId.toString('hex'),
    key_index: targetMultiSigKey.index,
    lnd: cluster.target.lnd,
    remote_key: controlMultiSigKey.public_key,
    transaction_id: fundingTxId,
    transaction_vout: fundingTxVout,
  });

  const coopCloseAddress = await createChainAddress({
    format: 'np2wpkh',
    lnd: cluster.control.lnd,
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
    lnd: cluster.control.lnd,
    partner_public_key: cluster.target.public_key,
    remote_key: targetMultiSigKey.public_key,
    transaction_id: fundingTxId,
    transaction_vout: fundingTxVout,
  });

  const pendingTarget = await getPendingChannels({lnd: cluster.target.lnd});

  const [incoming] = pendingTarget.pending_channels;

  equal(incoming.close_transaction_id, undefined, 'Not a closing tx');
  equal(incoming.is_active, false, 'Not active yet');
  equal(incoming.is_closing, false, 'Channel is not closing');
  equal(incoming.is_opening, true, 'Channel is opening');
  equal(incoming.is_partner_initiated, true, 'Peer initiated the channel');
  equal(incoming.local_balance, giveTokens, 'The incoming channel is split');
  equal(incoming.local_reserve, capacity * reserveRatio, 'Reserve ratio');
  equal(incoming.partner_public_key, cluster.control.public_key, 'Peer key');
  equal(incoming.pending_balance, undefined, 'No tokens pending');
  equal(incoming.pending_payments, undefined, 'No HTLCs active');
  equal(incoming.received, 0, 'Nothing received');
  equal(incoming.recovered_tokens, undefined, 'No recovery');
  equal(incoming.remote_balance, giveTokens - 9050, 'Remote balance amount');
  equal(incoming.remote_reserve, capacity * reserveRatio, 'Got peer reserve');
  equal(incoming.sent, 0, 'Nothing sent');
  equal(incoming.timelock_expiration, undefined, 'No timelock');
  equal(incoming.transaction_fee, 9050, 'Commit tx fee');
  equal(incoming.transaction_id, fundingTxId, 'Funding tx id is correct');
  equal(incoming.transaction_vout, fundingTxVout, 'Funding vout is correct');
  equal(incoming.transaction_weight, 724, 'Funding tx weight');

  // Setup the combined signed PSBTs that fund the channel
  const combinedTempPsbt = combinePsbts({
    psbts: [controlSignTempPsbt, targetSignTempPsbt].map(n => n.psbt),
  });

  // Finalize the combined PSBT
  const finalTempPsbt = finalizePsbt({psbt: combinedTempPsbt.psbt});

  // Pull out the signed broadcast-ready transaction from the PSBT
  const finalTempTx = extractTransaction({psbt: finalTempPsbt.psbt});

  // Calculate the size of the tx
  const txSize = fromHex(finalTempTx.transaction).virtualSize();

  equal(txSize <= fundingFee, true, 'Transaction size is not too large');

  // Broadcast the transaction to fund the control side
  await broadcastChainTransaction({
    transaction: controlSignPsbt.transaction,
    lnd: cluster.control.lnd,
  });

  // Broadcast the transaction to fund the target side
  await broadcastChainTransaction({
    transaction: targetSignPsbt.transaction,
    lnd: cluster.control.lnd,
  });

  // Broadcast the transaction to fund the channel
  await broadcastChainTransaction({
    transaction: finalTempTx.transaction,
    lnd: cluster.control.lnd,
  });

  // Mine the funding transactions into a block
  await asyncRetry({interval, times}, async () => {
    await cluster.control.generate({});

    const {channels} = await getChannels({lnd: cluster.control.lnd});

    if (!channels.find(n => n.is_active)) {
      throw new Error('ExpectedActiveChannel');
    }

    return;
  });

  const controlChannels = await getChannels({lnd: cluster.control.lnd});

  const [controlChannel] = controlChannels.channels;

  const closeAddr = coopCloseAddress.address;

  equal(controlChannel.capacity, capacity, 'Channel with capacity created');
  equal(controlChannel.commit_transaction_fee, 9050, 'Regular tx commit fee');
  equal(controlChannel.commit_transaction_weight, 724, 'Regular tx size');
  equal(controlChannel.cooperative_close_address, closeAddr, 'Got close addr');
  equal(controlChannel.cooperative_close_delay_height, 2459, 'Thaw height');
  equal(controlChannel.id, '443x3x0', 'Got channel id');
  equal(controlChannel.is_active, true, 'Channel is active and ready');
  equal(controlChannel.is_closing, false, 'Channel is not closing');
  equal(controlChannel.is_opening, false, 'Channel is already opened');
  equal(controlChannel.is_partner_initiated, false, 'Control opened');
  equal(controlChannel.is_private, true, 'Channel is private');
  equal(controlChannel.is_static_remote_key, true, 'Regular remote key');
  equal(controlChannel.local_balance, incoming.remote_balance, 'Control toks');
  equal(controlChannel.local_csv, 144, 'Channel CSV');
  equal(controlChannel.local_dust, 573, 'Channel dust');
  equal(controlChannel.local_given, giveTokens, 'Channel tokens given over');
  equal(controlChannel.local_max_htlcs, 483, 'Channel HTLCs max set');
  equal(controlChannel.partner_public_key, cluster.target.public_key, 'R-key');
  equal(controlChannel.transaction_id, fundingTxId, 'Funding tx id');
  equal(controlChannel.transaction_vout, fundingTxVout, 'Funding tx vout');

  const targetChannels = await getChannels({lnd: cluster.target.lnd});

  const [targetChannel] = targetChannels.channels;

  equal(targetChannel.capacity, capacity, 'Channel with capacity created');
  equal(targetChannel.commit_transaction_fee, 9050, 'Regular tx commit fee');
  equal(targetChannel.commit_transaction_weight, 724, 'Regular tx size');
  equal(targetChannel.cooperative_close_address, undefined, 'No close addr');
  equal(targetChannel.cooperative_close_delay_height, 2459, 'Thaw height');
  equal(targetChannel.id, '443x3x0', 'Got channel id');
  equal(targetChannel.is_active, true, 'Channel is active and ready');
  equal(targetChannel.is_closing, false, 'Channel is not closing');
  equal(targetChannel.is_opening, false, 'Channel is already opened');
  equal(targetChannel.is_partner_initiated, true, 'Control opened');
  equal(targetChannel.is_private, true, 'Channel is private');
  equal(targetChannel.is_static_remote_key, true, 'Regular remote key');
  equal(targetChannel.local_balance, giveTokens, 'Target tokens');
  equal(targetChannel.local_csv, 144, 'Channel CSV');
  equal(targetChannel.local_dust, 573, 'Channel dust');
  equal(targetChannel.local_given, 0, 'No tokens given');
  equal(targetChannel.local_max_htlcs, 483, 'Channel HTLCs max set');
  equal(targetChannel.partner_public_key, cluster.control.public_key, 'R-key');
  equal(targetChannel.transaction_id, fundingTxId, 'Funding tx id');
  equal(targetChannel.transaction_vout, fundingTxVout, 'Funding tx vout');

  await cluster.kill({});

  return end();
});
