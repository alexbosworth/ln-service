const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');
const {updateAlias} = require('./../../');

const alias = 'alias';

// Updating a node alias should result in an updated alias
test(`Update alias`, async ({end, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  try {
    const {color} = await getWalletInfo({lnd});

    await updateAlias({alias, lnd});

    const updated = await getWalletInfo({lnd});

    strictSame(updated.alias, alias, 'Alias was updated');
    strictSame(updated.color, color, 'Color was not updated');
  } catch (err) {
    strictSame(err, [400, 'ExpectedPeersRpcLndBuildTagToUpdateAlias']);
  }

  await kill({});

  return end();
});
