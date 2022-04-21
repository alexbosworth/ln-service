const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');
const {removeExternalSocket} = require('./../../');

// Removign a node socket should result in a no longer advertised socket
test(`Add external socket`, async ({end, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  try {
    const {uris} = await getWalletInfo({lnd});

    const [uri] = uris;

    const [, socket] = uri.split('@');

    await removeExternalSocket({lnd, socket});

    const updated = await getWalletInfo({lnd});

    strictSame(updated.uris, [], 'External socket removed');
  } catch (err) {
    strictSame(err, [400, 'ExpectedPeersRpcLndBuildTagToRemoveSocket']);
  }

  await kill({});

  return end();
});
