const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getFeeRates} = require('./../../');
const {openChannel} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

const confirmationCount = 20;
const defaultBaseFee = 1;
const defaultFeeRate = 1;

// Getting fee rates should return the fee rates of nodes in the channel graph
test(`Get fee rates`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  const channelOpen = await openChannel({
    lnd,
    local_tokens: 1e6,
    partner_public_key: cluster.target_node_public_key,
    socket: `${cluster.target.listen_ip}:${cluster.target.listen_port}`,
  });

  await waitForPendingChannel({lnd, id: channelOpen.transaction_id});

  await cluster.generate({count: confirmationCount});

  await waitForChannel({lnd, id: channelOpen.transaction_id});

  const {channels} = await getFeeRates({lnd});

  equal(channels.length, [channelOpen].length, 'Channel was opened');

  const [channel] = channels;

  equal(channel.base_fee, defaultFeeRate, 'Channel base fee');
  equal(channel.fee_rate, defaultBaseFee, 'Channel fee rate');
  equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
  equal(channel.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  await cluster.kill({});

  return end();
});
