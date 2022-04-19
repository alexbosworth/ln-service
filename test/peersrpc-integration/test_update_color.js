const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');
const {updateColor} = require('./../../');

const color = '#666666'

// Updating a node color should result in an updated color
test(`Update color`, async ({end, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  try {
    const {alias} = await getWalletInfo({lnd});

    await updateColor({color, lnd});

    const updated = await getWalletInfo({lnd});

    strictSame(updated.alias, alias, 'Alias was not updated');
    strictSame(updated.color, color, 'Color was updated');
  } catch (err) {
    strictSame(err, [400, 'ExpectedPeersRpcLndBuildTagToUpdateColor']);
  }

  await kill({});

  return end();
});
