const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {fundPendingChannels} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChannels} = require('./../../');
const {openChannel} = require('./../../');
const {openChannels} = require('./../../');
const {signPsbt} = require('./../../');

const channelCapacityTokens = 1e6;
const count = 100;
const defaultFee = 1e3;
const description = 'description';
const interval = 250;
const size = 2;
const times = 1000;

// Opening a simplified taproot channel should open a simple taproot channel
test(`Open simplified taproot channel`, async () => {
  // Test for LND 0.16.4 or below to exit early and avoid test
  {
    const {kill, nodes} = await spawnLightningCluster({size});

    const [{generate, id, lnd}, target] = nodes;

    await generate({count});

    const channelOpen = await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: target.id, socket: target.socket});

      return await openChannel({
        description,
        lnd,
        chain_fee_tokens_per_vbyte: defaultFee,
        local_tokens: channelCapacityTokens,
        partner_public_key: target.id,
        socket: target.socket,
      });
    });

    const channel = await asyncRetry({interval, times}, async () => {
      await generate({});

      const {channels} = await getChannels({lnd});

      const [channel] = channels;

      if (!channel) {
        throw new Error('ExpectedChannelOpened');
      }

      return channel;
    });

    await kill({});

    // Exit early when on LND 0.16.4 that do not support simplified taproot
    if (channel.description !== description) {
      return;
    }
  }

  // Try opening a simplified taproot channel
  {
    const {kill, nodes} = await spawnLightningCluster({
      size,
      lnd_configuration: ['--protocol.simple-taproot-chans'],
    });

    const [{generate, id, lnd}, target] = nodes;

    await generate({count});

    await addPeer({lnd, public_key: target.id, socket: target.socket});

    const channelOpen = await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: target.id, socket: target.socket});

      return await openChannel({
        lnd,
        chain_fee_tokens_per_vbyte: defaultFee,
        is_private: true,
        is_simplified_taproot: true,
        local_tokens: channelCapacityTokens,
        partner_public_key: target.id,
        socket: target.socket,
      });
    });

    const channel = await asyncRetry({interval, times}, async () => {
      await generate({});

      const {channels} = await getChannels({lnd});

      const [channel] = channels;

      if (!channel) {
        throw new Error('ExpectedChannelOpened');
      }

      return channel;
    });

    equal(channel.type, 'simplified_taproot', 'Opened simplified taproot');

    await kill({});
  }

  // Try opening a simplified taproot channel via PSBT funding
  {
    const {kill, nodes} = await spawnLightningCluster({
      size,
      lnd_configuration: ['--protocol.simple-taproot-chans'],
    });

    const [{generate, id, lnd}, target] = nodes;

    await generate({count});

    await addPeer({lnd, public_key: target.id, socket: target.socket});

    const channelOpen = await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: target.id, socket: target.socket});

      return await openChannels({
        lnd,
        channels: [{
          capacity: channelCapacityTokens,
          is_private: true,
          is_simplified_taproot: true,
          partner_public_key: target.id,
        }],
      });
    });

    const funded = await fundPsbt({lnd, outputs: channelOpen.pending});

    const signed = await signPsbt({lnd, psbt: funded.psbt});

    await fundPendingChannels({
      lnd,
      channels: channelOpen.pending.map(n => n.id),
      funding: signed.psbt,
    });

    await broadcastChainTransaction({lnd, transaction: signed.transaction});

    const channel = await asyncRetry({interval, times}, async () => {
      await generate({});

      const {channels} = await getChannels({lnd});

      const [channel] = channels;

      if (!channel) {
        throw new Error('ExpectedChannelOpened');
      }

      return channel;
    });

    equal(channel.type, 'simplified_taproot', 'Opened simplified taproot');

    await kill({});
  }

  return;
});
