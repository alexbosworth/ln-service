const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getFeeRates} = require('./../../');

const defaultBaseFee = 1;
const defaultFeeRate = 1;
const size = 2;

// Getting fee rates should return the fee rates of nodes in the channel graph
test(`Get fee rates`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, to] = nodes;

  const channelOpen = await setupChannel({generate, lnd, to});

  const {channels} = await getFeeRates({lnd});

  strictEqual(channels.length, [channelOpen].length, 'Channel was opened');

  const [channel] = channels || [{}];

  if (!!channel.id) {
    strictEqual(channel.id, channelOpen.id, 'Channel id is represented');
  }

  strictEqual(channel.base_fee, defaultFeeRate, 'Channel base fee');
  strictEqual(channel.base_fee_mtokens, (defaultFeeRate * 1000)+'', 'Base');
  strictEqual(channel.fee_rate, defaultBaseFee, 'Channel fee rate');
  strictEqual(channel.transaction_id, channelOpen.transaction_id, 'Tx id');
  strictEqual(channel.transaction_vout, channelOpen.transaction_vout, 'Vout');

  await kill({});

  return;
});
