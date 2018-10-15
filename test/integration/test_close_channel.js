const {test} = require('tap');

const closeChannel = require('./../../closeChannel');
const {createCluster} = require('./../macros');
const getChannels = require('./../../getChannels');
const openChannel = require('./../../openChannel');

const channelCapacityTokens = 1e6;
const confirmationCount = 6;
const defaultFee = 1e3;
const defaultVout = 0;
const giftTokens = 1e4;

// Closing a channel should close the channel
test(`Close channel`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const channelOpen = await openChannel({
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    lnd: cluster.control.lnd,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target_node_public_key,
  });

  await cluster.generate({count: confirmationCount});

  const channelClose = await closeChannel({
    is_force_close: true,
    lnd: cluster.control.lnd,
    tokens_per_vbyte: defaultFee,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  equal(!!channelClose.transaction_id, true, 'Closing id is returned');
  equal(channelClose.transaction_vout, defaultVout, 'Closing vout returned');
  equal(channelClose.type, 'pending_close_channel', 'Row type returned');

  cluster.kill();

  return end();
});

