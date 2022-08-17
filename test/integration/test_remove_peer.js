const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {getPeers} = require('./../../');
const {removePeer} = require('./../../');

const interval = 10;
const size = 2;
const times = 2000;

// Removing peers should result in a removed peer
test(`Remove a peer`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{id, lnd}, target] = nodes;

  try {
    await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: target.id, socket: target.socket});
    });

    const {peers} = await getPeers({lnd});

    const [targetPeer] = peers;

    equal(targetPeer.public_key, target.id, 'Peer is added');

    await removePeer({lnd, public_key: targetPeer.public_key});

    await asyncRetry({interval, times}, async () => {
      const postRemovalPeers = await getPeers({lnd});

      if (!!postRemovalPeers.peers.length) {
        throw new Error('ExpectedPeerRemoved');
      }

      equal(postRemovalPeers.peers.length, [].length, 'Peer is removed');
    });
  } catch (err) {
    equal(err, null, 'Expected no error');
  }

  await kill({});

  return end();
});
