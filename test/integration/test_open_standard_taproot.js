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

// Opening a standard taproot channel should open a standard taproot channel
test(`Open standard taproot channel`, async () => {
  // Test for LND 0.20.0 or below to exit early and avoid test
  {
  }

  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: ['--protocol.simple-taproot-chans'],
  });

  const [{generate, id, lnd}, target] = nodes;

  // Try opening a standard taproot channel
  try {
    await generate({count});

    await addPeer({lnd, public_key: target.id, socket: target.socket});

    const channelOpen = await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: target.id, socket: target.socket});

      try {
        return await openChannel({
          lnd,
          chain_fee_tokens_per_vbyte: defaultFee,
          is_private: true,
          is_standard_taproot: true,
          local_tokens: channelCapacityTokens,
          partner_public_key: target.id,
          socket: target.socket,
        });
      } catch (err) {
        const [code, message, details] = err;

        if (!!details && details.err === 'unhandled request channel type 7') {
          return;
        } else {
          throw err;
        }
      }
    });

    // Exit early when there is no support for standard taproot
    if (!channelOpen) {
      return await kill({});
    }

    const channel = await asyncRetry({interval, times}, async () => {
      await generate({});

      const {channels} = await getChannels({lnd});

      const [channel] = channels;

      if (!channel) {
        throw new Error('ExpectedChannelOpened');
      }

      return channel;
    });

    equal(channel.type, 'standard_taproot', 'Opened standard taproot');
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return;
});
