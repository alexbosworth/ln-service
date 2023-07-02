const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {getWalletInfo} = require('./../../');
const {removeExternalSocket} = require('./../../');

// Removign a node socket should result in a no longer advertised socket
test(`Add external socket`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  try {
    const {uris} = await getWalletInfo({lnd});

    const [uri] = uris;

    const [, socket] = uri.split('@');

    await removeExternalSocket({lnd, socket});

    const updated = await getWalletInfo({lnd});

    deepEqual(updated.uris, [], 'External socket removed');
  } catch (err) {
    deepEqual(err, [400, 'ExpectedPeersRpcLndBuildTagToRemoveSocket']);
  }

  await kill({});

  return;
});
