const {test} = require('tap');

const getChainFeeRate = require('./../../getChainFeeRate');
const {delay} = require('./../macros');
const {spawnLnd} = require('./../macros');

// Getting the chain fee rate should return the fee rate estimate
test(`Get chain fee rate`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  const feeRate = await getChainFeeRate({lnd: spawned.wallet_lnd});

  equal(feeRate.tokens_per_vbyte, 50, 'Fee rate is returned');

  spawned.kill();

  await delay(3000);

  return end();
});
