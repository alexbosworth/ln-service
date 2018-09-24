const {promisify} = require('util');

const {test} = require('tap');

const getChainBalance = require('./../../getChainBalance');
const {spawnLnd} = require('./../macros');

const emptyChainBalance = 0;

// Getting chain balance should result in a chain balance
test(`Get the chain balance`, async ({end, equal}) => {
  const {kill, lnd} = await promisify(spawnLnd)({});

  const result = await getChainBalance({lnd});

  equal(result.chain_balance, emptyChainBalance, 'Valid chain balance');

  kill();

  return end();
});

