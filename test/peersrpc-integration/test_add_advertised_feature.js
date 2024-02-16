const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {addAdvertisedFeature} = require('./../../');
const {getWalletInfo} = require('./../../');

const feature = 12345;

// Adding a feature should result in an updated advertised feature
test(`Add external socket`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  try {
    await addAdvertisedFeature({feature, lnd});

    const {features} = await getWalletInfo({lnd});

    const added = features.find(n => n.bit === feature);

    deepEqual(
      added,
      {
        bit: 12345,
        is_known: false,
        is_required: false,
        type: undefined,
      },
      'Feature bit is advertised'
    );

    await kill({});
  } catch (err) {
    await kill({});

    deepEqual(err, [400, 'ExpectedPeersRpcLndBuildTagToAddFeature']);
  }

  return;
});
