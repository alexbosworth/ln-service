const asyncRetry = require('async/retry');
const {test} = require('tap');

const {closeChannel} = require('./../../');
const {createCluster} = require('./../macros');
const {getChannels} = require('./../../');
const {getClosedChannels} = require('./../../');
const {openChannel} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const confirmationCount = 6;
const defaultFee = 1e3;
const interval = retryCount => 10 * Math.pow(2, retryCount);
const maxChanTokens = Math.pow(2, 24) - 1;
const times = 20;

// Getting closed channels should return closed channels
test(`Close channel`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const channelOpen = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    lnd: cluster.control.lnd,
    local_tokens: maxChanTokens,
    partner_public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  await waitForPendingChannel({
    id: channelOpen.transaction_id,
    lnd: cluster.control.lnd,
  });

  await cluster.generate({count: confirmationCount});

  await waitForChannel({
    id: channelOpen.transaction_id,
    lnd: cluster.control.lnd,
  });

  const closing = await closeChannel({
    lnd: cluster.control.lnd,
    tokens_per_vbyte: defaultFee,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  await cluster.generate({count: confirmationCount});

  // Wait for channel to close
  await asyncRetry({interval, times}, async () => {
    const {channels} = await getClosedChannels({lnd});

    if (!channels.length) {
      throw new Error('ExpectedClosedChannel');
    }
  });

  const {channels} = await getClosedChannels({lnd: cluster.control.lnd});

  const [channel] = channels;

  equal(channels.length, [channelOpen].length, 'Channel close listed');

  if (!!channel) {
    equal(channel.capacity, maxChanTokens, 'Channel capacity reflected');
    equal(!!channel.close_confirm_height, true, 'Channel close height');
    equal(channel.close_transaction_id, closing.transaction_id, 'Close tx id');
    equal(maxChanTokens - channel.final_local_balance, 9050, 'Final balance');
    equal(channel.final_time_locked_balance, 0, 'Final locked balance');
    equal(!!channel.id, true, 'Channel id');
    equal(channel.is_breach_close, false, 'Not breach close');
    equal(channel.is_cooperative_close, true, 'Is cooperative close');
    equal(channel.is_funding_cancel, false, 'Not funding cancel');
    equal(channel.is_local_force_close, false, 'Not local force close');
    equal(channel.is_remote_force_close, false, 'Not remote force close');
    equal(channel.partner_public_key, cluster.target_node_public_key, 'Pubkey');
    equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
    equal(channel.transaction_vout, channelOpen.transaction_vout, 'Chan vout');
  }

  // Partner closed is not supported on 0.9.0 or earlier
  if (!!channel && channel.is_partner_closed !== undefined) {
    equal(channel.is_partner_closed, false, 'Partner did not close the chan');
  }

  // Partner initiated is not supported on 0.9.0 or earlier
  if (!!channel && channel.is_partner_initiated !== undefined) {
    equal(channel.is_partner_initiated, false, 'Partner did not open channel');
  }

  await cluster.kill({});

  return end();
});
