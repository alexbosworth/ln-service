const {test} = require('@alexbosworth/tap');

const {getChannelBalance} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const emptyBalance = 0;

// Getting channel balance should result in a channel balance
test(`Get the channel balance`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const result = await getChannelBalance({lnd});

  equal(result.channel_balance, emptyBalance, 'Valid channel balance');

  kill();

  await waitForTermination({lnd});

  return end();
});
