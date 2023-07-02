const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChannelBalance} = require('./../../');

const emptyBalance = 0;

// Getting channel balance should result in a channel balance
test(`Get the channel balance`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const result = await getChannelBalance({lnd});

  strictEqual(result.channel_balance, emptyBalance, 'Valid channel balance');

  await kill({});

  return;
});
