const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getFeeRates} = require('./../../');
const {setupChannel} = require('./../macros');

const defaultBaseFee = 1;
const defaultFeeRate = 1;
const size = 2;

// Getting fee rates should return the fee rates of nodes in the channel graph
test(`Get fee rates`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, to] = nodes;

  const channelOpen = await setupChannel({generate, lnd, to});

  const {channels} = await getFeeRates({lnd});

  equal(channels.length, [channelOpen].length, 'Channel was opened');

  const [channel] = channels || [{}];

  if (!!channel.id) {
    equal(channel.id, channelOpen.id, 'Channel id is represented');
  }

  equal(channel.base_fee, defaultFeeRate, 'Channel base fee');
  equal(channel.base_fee_mtokens, (defaultFeeRate * 1000)+'', 'Base fee mtok');
  equal(channel.fee_rate, defaultBaseFee, 'Channel fee rate');
  equal(channel.transaction_id, channelOpen.transaction_id, 'Channel tx id');
  equal(channel.transaction_vout, channelOpen.transaction_vout, 'Tx vout');

  await kill({});

  return end();
});
