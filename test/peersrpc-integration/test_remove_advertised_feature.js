const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {addAdvertisedFeature} = require('./../../');
const {getWalletInfo} = require('./../../');
const {removeAdvertisedFeature} = require('./../../');

const feature = 12345;

// Removing a feature should result in an updated advertised feature
test(`Add external socket`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  try {
    await addAdvertisedFeature({feature, lnd});

    await removeAdvertisedFeature({feature, lnd});

    const {features} = await getWalletInfo({lnd});

    const added = features.find(n => n.bit === feature);

    equal(added, undefined, 'Feature was removed');

    await kill({});
  } catch (err) {
    await kill({});

    deepEqual(err, [400, 'ExpectedPeersRpcLndBuildTagToAddFeature']);
  }

  return;
});
