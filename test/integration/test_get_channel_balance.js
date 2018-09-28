const {promisify} = require('util');

const {test} = require('tap');

const getChannelBalance = require('./../../getChannelBalance');
const {spawnLnd} = require('./../macros');

const emptyBalance = 0;

// Getting channel balance should result in a channel balance
test(`Get the channel balance`, async ({end, equal}) => {
  const {kill, lnd} = await promisify(spawnLnd)({});

  const result = await getChannelBalance({lnd});

  equal(result.channel_balance, emptyBalance, 'Valid channel balance');

  kill();

  return end();
});

