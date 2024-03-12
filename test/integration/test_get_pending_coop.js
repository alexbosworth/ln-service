const {equal} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {idForTransactionComponents} = require('@alexbosworth/blockchain');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');

const defaultFee = 1e3;
const give = 1e4;
const hexAsBuffer = hex => Buffer.from(hex, 'hex');
const interval = 10;
const size = 2;
const times = 2000;

// Getting pending channels should show pending channels
test(`Get pending channels`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    const {features} = await getWalletInfo({lnd});

    // Target starts a channel with control
    const coopChan = await setupChannel({
      generate,
      lnd,
      give_tokens: give,
      to: target,
    });

    // Target closes the channel
    const niceClose = await closeChannel({
      lnd: target.lnd,
      tokens_per_vbyte: 100,
      transaction_id: coopChan.transaction_id,
      transaction_vout: coopChan.transaction_vout,
    });

    // Control views their pending channels
    const {channel} = await asyncRetry({interval, times}, async () => {
      const res = await getPendingChannels({lnd});

      const id = coopChan.transaction_id;

      const channel = res.pending_channels.find(n => n.transaction_id === id);

      if (!channel) {
        throw new Error('FailedToFindPendingChannelWithTransactionId');
      }

      return {channel};
    });

    const transaction = channel.close_transaction;

    // LND 0.17.4 and below do not support close_transaction
    if (!!transaction) {
      const components = componentsOfTransaction({transaction});

      const closing = idForTransactionComponents({
        inputs: components.inputs.map(input => ({
          hash: hexAsBuffer(input.id).reverse(),
          script: hexAsBuffer(input.script),
          sequence: input.sequence,
          vout: input.vout,
        })),
        locktime: components.locktime,
        outputs: components.outputs.map(output => ({
          script: hexAsBuffer(output.script),
          tokens: output.tokens,
        })),
        version: components.version,
      });

      equal(closing.id, channel.close_transaction_id, 'Got closing tx');
    }

    if (channel.is_partner_initiated !== undefined) {
      strictEqual(channel.is_partner_initiated, false, 'Channel initiated');
    }

    strictEqual(channel.local_balance, 986530, 'Original balance');
    strictEqual(channel.pending_balance, 986530, 'Waiting on balance');

    strictEqual(channel.capacity, 1000000, 'Got channel capacity');
    strictEqual(channel.is_active, false, 'Ended');
    strictEqual(channel.is_closing, true, 'Closing');
    strictEqual(channel.is_opening, false, 'Not Opening');
    strictEqual(channel.local_reserve, 10000, 'Local reserve');
    strictEqual(channel.partner_public_key, target.id, 'Target public key');
    strictEqual(channel.pending_payments, undefined, 'No pending payments');
    strictEqual(channel.received, 0, 'Never received');
    strictEqual(channel.recovered_tokens, undefined, 'Nothing to recover');
    strictEqual(channel.remote_reserve, 10000, 'Remote reserve');
    strictEqual(channel.sent, 0, 'Never sent anything');
    strictEqual(channel.timelock_expiration, undefined, 'No timelock in coop');
    strictEqual(channel.transaction_fee, null, 'No transaction fee data');
    strictEqual(channel.transaction_id, coopChan.transaction_id, 'funding tx');
    strictEqual(channel.transaction_vout, coopChan.transaction_vout, 'Vout');
    strictEqual(channel.transaction_weight, null, 'No funding tx weight data');

    if (!!channel.remote_balance) {
      strictEqual(channel.remote_balance, give, 'Opposing channel balance');
    }

    await kill({});
  } catch (err) {
    await kill({});

    strictEqual(err, null, 'Expected no error');
  }

  return;
});
