const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChainFeeRate} = require('./../../');

// Getting the chain fee rate should return the fee rate estimate
test(`Get chain fee rate`, async () => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const feeRate = await getChainFeeRate({lnd});

  // LND 0.18.5 and below return 50
  if (feeRate.tokens_per_vbyte === 50) {
    equal(feeRate.tokens_per_vbyte, 50, 'Fee rate is returned');
  } else {
    equal(feeRate.tokens_per_vbyte, 25, 'Fee rate is returned');
  }

  await kill({});

  return;
});
