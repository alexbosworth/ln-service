const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getPublicKey} = require('./../../');
const {getWalletInfo} = require('./../../');

const identityKeyFamily = 6;

// Getting a public key out of the seed should return the raw public key
test(`Get public key`, async ({end, equal}) => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const key = await getPublicKey({
    lnd,
    family: identityKeyFamily,
    index: [].length,
  });

  const wallet = await getWalletInfo({lnd});

  equal(wallet.public_key, key.public_key, 'Derive identity public key');

  await kill({});

  return end();
});
