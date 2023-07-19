const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getEphemeralChannelIds} = require('./../../');
const {openChannel} = require('./../../');
const {openChannels} = require('./../../');
const {subscribeToChannels} = require('./../../');
const {subscribeToOpenRequests} = require('./../../');

const capacity = 1e6;
const interval = 10;
const maturity = 100;
const size = 2;
const times = 4000;

// Opening an unconfirmed channel should in an immediate channel opening
test(`Open an unconfirmed channel`, async () => {
  // Unconfirmed channels are not supported on LND 0.15.0 and below
  {
    const {kill, nodes} = await spawnLightningCluster({});

    const [{lnd}] = nodes;

    try {
      await getEphemeralChannelIds({lnd});

      await kill({});
    } catch (err) {
      deepEqual(err, [501, 'ListAliasesMethodNotSupported']);

      await kill({});

      return;
    }
  }

  const {kill, nodes} = await spawnLightningCluster({
    size,
    lnd_configuration: [
      '--maxpendingchannels=10',
      '--protocol.option-scid-alias',
      '--protocol.zero-conf',
    ],
  });

  const [{generate, lnd}, target] = nodes;

  try {
    await generate({count: maturity});

    // Connect to the peer
    await addPeer({lnd, public_key: target.id, socket: target.socket});

    // Wait for channel to be receptive to opens
    await asyncRetry({interval, times}, async () => {
      return await openChannels({
        lnd,
        channels: [{capacity, partner_public_key: target.id}],
      });
    });

    const acceptSub = subscribeToOpenRequests({lnd: target.lnd});

    acceptSub.on('channel_request', request => {
      equal(request.is_trusted_funding, true, 'Request is trusted funding');

      return request.accept({is_trusted_funding: true});
    });

    // Propose the channel to the peer
    const pending = await asyncRetry({interval, times}, async () => {
      return await openChannel({
        lnd,
        is_trusted_funding: true,
        local_tokens: capacity,
        partner_public_key: target.id,
      });
    });

    equal(pending.transaction_id.length, 64, 'Got transaction id');
    equal(pending.transaction_vout, 0, 'Got transaction output index');
  } catch (err) {
    equal(err, null, 'No more error reported');
  }

  await kill({});

  return;
});
