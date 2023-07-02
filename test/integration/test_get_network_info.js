const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getNetworkInfo} = require('./../../');

const size = 2;
const tokens = 1e6;

// Getting the network info should return basic network statistics
test(`Get network info`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await setupChannel({generate, lnd, to: target});

  const result = await getNetworkInfo({lnd});

  strictEqual(result.average_channel_size, tokens, 'Average channel size');
  strictEqual(result.channel_count, 1, 'Channel count');
  strictEqual(result.max_channel_size, tokens, 'Maximum channel size');
  strictEqual(result.median_channel_size, tokens, 'Median channel size');
  strictEqual(result.min_channel_size, tokens, 'Minimum channel size');
  strictEqual(result.not_recently_updated_policy_count, 0, 'No updated count');
  strictEqual(result.total_capacity, tokens, 'Total capacity');

  await kill({});

  return;
});
