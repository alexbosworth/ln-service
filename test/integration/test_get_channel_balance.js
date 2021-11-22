const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChannelBalance} = require('./../../');

const emptyBalance = 0;

// Getting channel balance should result in a channel balance
test(`Get the channel balance`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const result = await getChannelBalance({lnd});

  equal(result.channel_balance, emptyBalance, 'Valid channel balance');

  await kill({});

  return end();
});
