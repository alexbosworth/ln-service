const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addExternalSocket} = require('./../../');
const {getWalletInfo} = require('./../../');

const socket = '192.168.0.1:12345';

// Adding a node socket should result in an updated advertised socket
test(`Add external socket`, async ({end, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{id, lnd}] = nodes;

  const additional = `${id}@${socket}`;

  try {
    const {uris} = await getWalletInfo({lnd});

    const [existing] = uris;

    await addExternalSocket({lnd, socket});

    const updated = await getWalletInfo({lnd});

    strictSame(updated.uris, [existing, additional], 'Added new socket');
  } catch (err) {
    strictSame(err, [400, 'ExpectedPeersRpcLndBuildTagToAddSocket']);
  }

  await kill({});

  return end();
});
