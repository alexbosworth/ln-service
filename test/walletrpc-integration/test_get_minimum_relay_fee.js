const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getMinimumRelayFee} = require('./../../');

// Getting the min chain fee rate should return the min fee rate
test(`Get minimum chain fee rate`, async () => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  try {
    const feeRate = await getMinimumRelayFee({lnd});

    await kill({});

    // LND 0.18.2 and below do not return a minimum relay fee rate
    if (!!feeRate.tokens_per_vbyte) {
      equal(feeRate.tokens_per_vbyte, 1.012, 'Fee rate is returned');
    }
  } catch (err) {
    equal(null, err, 'Expected no error getting relay fee');
  }

  return;
});
