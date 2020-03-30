const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getFeeRates} = require('./../../');
const {setupChannel} = require('./../macros');

const defaultBaseFee = 1;
const defaultFeeRate = 1;

// Getting fee rates should return the fee rates of nodes in the channel graph
test(`Get fee rates`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  const {channels} = await getFeeRates({lnd});

  equal(channels.length, [channelOpen].length, 'Channel was opened');

  const [channel] = channels || [{}];

  if (!!channel.id) {
    equal(channel.id, channelOpen.id, 'Channel id is represented');
  }

  equal(channel.base_fee, defaultFeeRate, 'Channel base fee');
  equal(channel.fee_rate, defaultBaseFee, 'Channel fee rate');
  equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
  equal(channel.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  await cluster.kill({});

  return end();
});
