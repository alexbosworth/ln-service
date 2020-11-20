const {randomBytes} = require('crypto');

const {address} = require('bitcoinjs-lib');
const asyncRetry = require('async/retry');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');
const {test} = require('tap');
const {Transaction} = require('bitcoinjs-lib');

const {broadcastChainTransaction} = require('./../../');
const {createCluster} = require('./../macros');
const {fundPsbt} = require('./../../');
const {getChannels} = require('./../../');
const {getPublicKey} = require('./../../');
const {prepareForChannelProposal} = require('./../../');
const {proposeChannel} = require('./../../');
const {signPsbt} = require('./../../');

const capacity = 1e6;
const cooperativeCloseDelay = 2016;
const {fromHex} = Transaction;
const {fromOutputScript} = address;
const id = randomBytes(32).toString('hex');
const interval = 100;
const keyIndex = 0;
const {p2pkh} = payments;
const {regtest} = networks;
const times = 100;

// Proposing a cooperative delay channel should open a cooperative delay chan
test(`Propose a channel with a cooperative delay`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const controlKey = await getPublicKey({
    family: 0,
    lnd: cluster.control.lnd,
  });

  const targetKey = await getPublicKey({
    family: 0,
    lnd: cluster.target.lnd,
  });

  const pubkeys = [controlKey.public_key, targetKey.public_key];

  const fundingAddress = payments.p2wsh({
    redeem: payments.p2ms({
      m: pubkeys.length,
      pubkeys: pubkeys.sort().map(n => Buffer.from(n, 'hex')),
    }),
  });

  const address = fromOutputScript(fundingAddress.output, networks.regtest);

  const outputs = [{address, tokens: capacity}];

  const fund = await asyncRetry({interval, times}, async () => {
    try {
      return await fundPsbt({
        outputs,
        lnd: cluster.control.lnd,
        fee_tokens_per_vbyte: 1,
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
  if (!fund) {
    await cluster.kill({});

    return end();
  }

  const outputIndex = fund.outputs.findIndex(n => !n.is_change);

  const {transaction} = await signPsbt({
    lnd: cluster.control.lnd,
    psbt: fund.psbt,
  });

  const tx = fromHex(transaction);

  const txId = tx.getId();
  const txVout = fund.outputs.findIndex(n => !n.is_change);

  await prepareForChannelProposal({
    id,
    cooperative_close_delay: cooperativeCloseDelay,
    key_index: targetKey.index,
    lnd: cluster.target.lnd,
    remote_key: controlKey.public_key,
    transaction_id: txId,
    transaction_vout: txVout,
  });

  await proposeChannel({
    capacity,
    id,
    cooperative_close_address: address,
    cooperative_close_delay: cooperativeCloseDelay,
    give_tokens: capacity / pubkeys.length,
    is_private: true,
    key_index: keyIndex,
    lnd: cluster.control.lnd,
    partner_public_key: cluster.target.public_key,
    remote_key: targetKey.public_key,
    transaction_id: txId,
    transaction_vout: txVout,
  });

  await broadcastChainTransaction({
    transaction,
    lnd: cluster.control.lnd,
  });

  await cluster.control.generate({count: 10});

  const [ctrlChan] = (await getChannels({lnd: cluster.control.lnd})).channels;
  const [targetChan] = (await getChannels({lnd: cluster.target.lnd})).channels;

  equal(ctrlChan.cooperative_close_address, address, 'Got adddress');
  equal(ctrlChan.local_balance+ctrlChan.commit_transaction_fee, 5e5, 'Split');
  equal(ctrlChan.local_given, 5e5, 'Got push amount');
  equal(ctrlChan.transaction_id, txId, 'Got transaction id');
  equal(ctrlChan.transaction_vout, txVout, 'Got transaction output index');
  equal(ctrlChan.cooperative_close_delay_height, 2459, 'Got ctl delay height');
  equal(targetChan.cooperative_close_delay_height, 2459, 'Got delay height');
  equal(targetChan.is_private, true, 'Channel created privately');

  await cluster.kill({});
  return end();
});
