const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {closeChannel} = require('./../../');
const {getChannels} = require('./../../');
const {getClosedChannels} = require('./../../');
const {subscribeToChannels} = require('./../../');

const anchorTokens = 330;
const capacity = 1e6;
const giveTokens = 3e5;
const interval = 100;
const partnerCsvDelay = 20;
const size = 2;
const times = 1000;

// Force closing a channel should resolve the balance output values
test('Force close resolutions', async t => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;
  const subs = [];

  // Stop subscriptions and spawned nodes whether the test passes or fails
  t.after(async () => {
    subs.forEach(n => n.removeAllListeners());

    await kill({});
  });

  // Stop retrying once the test has ended so nothing runs against dead nodes
  const retry = (args, task) => {
    return asyncRetry({...args, errorFilter: () => !t.signal.aborted}, task);
  };

  const controlClosed = [];
  const controlResolved = [];
  const errors = [];
  const {generate, lnd} = control;
  const targetClosed = [];
  const targetResolved = [];

  const controlSub = subscribeToChannels({lnd});
  const targetSub = subscribeToChannels({lnd: target.lnd});

  subs.push(controlSub, targetSub);

  controlSub.on('channel_closed', update => controlClosed.push(update));
  controlSub.on('channel_resolved', update => controlResolved.push(update));
  controlSub.on('error', err => errors.push(err));
  targetSub.on('channel_closed', update => targetClosed.push(update));
  targetSub.on('channel_resolved', update => targetResolved.push(update));
  targetSub.on('error', err => errors.push(err));

  const channelOpen = await setupChannel({
    capacity,
    generate,
    lnd,
    give_tokens: giveTokens,
    partner_csv_delay: partnerCsvDelay,
    to: target,
  });

  // The local balance is the value of the balance output on the close
  const [channel] = (await getChannels({lnd})).channels;

  // The target force closes the channel with a balance on both sides
  await closeChannel({
    is_force_close: true,
    lnd: target.lnd,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  // Wait for both nodes to see the close transaction confirm
  await retry({interval, times}, async () => {
    await generate({});

    if (!controlClosed.length || !targetClosed.length) {
      throw new Error('ExpectedChannelClosedEvents');
    }
  });

  const [controlClose] = controlClosed;
  const [targetClose] = targetClosed;

  // Close events are emitted before the sweeps of the outputs are reported
  strictEqual(controlClose.anchor_tokens, undefined, 'No anchor value yet');
  strictEqual(controlClose.close_balance_tokens, undefined, 'No balance yet');
  strictEqual(controlClose.is_remote_force_close, true, 'Remote force close');
  strictEqual(controlClose.transaction_id, channelOpen.transaction_id, 'Tx');
  strictEqual(controlClose.transaction_vout, channelOpen.transaction_vout);

  strictEqual(targetClose.anchor_tokens, undefined, 'No anchor value yet');
  strictEqual(targetClose.close_balance_tokens, undefined, 'No balance yet');
  strictEqual(targetClose.is_local_force_close, true, 'Local force close');
  strictEqual(targetClose.transaction_id, channelOpen.transaction_id, 'Tx');
  strictEqual(targetClose.transaction_vout, channelOpen.transaction_vout);

  // Wait for the sweeps to confirm and the channel to be fully resolved
  await retry({interval, times}, async () => {
    await generate({});

    if (!controlResolved.length || !targetResolved.length) {
      throw new Error('ExpectedChannelResolvedEvents');
    }
  });

  const [controlResolve] = controlResolved;
  const [targetResolve] = targetResolved;

  strictEqual(controlResolve.transaction_id, channelOpen.transaction_id);
  strictEqual(controlResolve.transaction_vout, channelOpen.transaction_vout);
  strictEqual(targetResolve.transaction_id, channelOpen.transaction_id);
  strictEqual(targetResolve.transaction_vout, channelOpen.transaction_vout);

  // Once resolved, the closed channel reports the swept balance output value
  const [chan] = (await getClosedChannels({lnd})).channels;

  strictEqual(!!chan.close_balance_spent_by, true, 'Control balance sweep');
  strictEqual(chan.close_balance_tokens, channel.local_balance, 'Balance');
  strictEqual(chan.close_balance_vout !== undefined, true, 'Balance vout');
  strictEqual(chan.is_remote_force_close, true, 'Control sees remote close');

  // An anchor is only swept and reported when it is economical to spend
  if (chan.anchor_tokens !== undefined) {
    strictEqual(chan.anchor_tokens, anchorTokens, 'Control anchor value');
  }

  const [forced] = (await getClosedChannels({lnd: target.lnd})).channels;

  strictEqual(!!forced.close_balance_spent_by, true, 'Target balance sweep');
  strictEqual(forced.close_balance_tokens, giveTokens, 'Target balance value');
  strictEqual(forced.close_balance_vout !== undefined, true, 'Balance vout');
  strictEqual(forced.final_local_balance, giveTokens, 'Target final balance');
  strictEqual(forced.is_local_force_close, true, 'Target force closed');

  if (forced.anchor_tokens !== undefined) {
    strictEqual(forced.anchor_tokens, anchorTokens, 'Target anchor value');
  }

  strictEqual(errors.length, [].length, 'No errors encountered');

  return;
});
