const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChainFeeRate} = require('./../../');

// Getting the chain fee rate should return the fee rate estimate
test(`Get chain fee rate`, async ({end, equal}) => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const feeRate = await getChainFeeRate({lnd});

  equal(feeRate.tokens_per_vbyte, 50, 'Fee rate is returned');

  await kill({});

  return end();
});
