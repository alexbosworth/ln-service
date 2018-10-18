const {test} = require('tap');

const {createCluster} = require('./../macros');
const getFeeRates = require('./../../getFeeRates');
const openChannel = require('./../../openChannel');

const confirmationCount = 6;

// Getting fee rates should return the fee rates of nodes in the channel graph
test(`Get fee rates`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const channelOpen = await openChannel({
    lnd,
    partner_public_key: cluster.target_node_public_key,
  });

  await cluster.generate({count: confirmationCount});

  const {channels} = await getFeeRates({lnd});

  const [channel] = channels;

  equal(channel.base_fee, 1, 'Channel base fee');
  equal(channel.fee_rate, 1, 'Channel fee rate');
  equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
  equal(channel.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  cluster.kill();

  return end();
});

