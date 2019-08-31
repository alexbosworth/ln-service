const {test} = require('tap');

const {addPeer} = require('./../../');
const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {deleteForwardingReputations} = require('./../../');
const {delay} = require('./../macros');
const {getChannels} = require('./../../');
const {getForwardingReputations} = require('./../../');
const {payViaPaymentRequest} = require('./../../');
const {probeForRoute} = require('./../../');
const {setupChannel} = require('./../macros');

const tokens = 1e6 / 2;

// Probing for a route should return a route
test('Probe for route', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;
  const {remote} = cluster;

  const controlToTargetChan = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  const [controlChannel] = (await getChannels({lnd})).channels;

  const targetToRemoteChan = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    lnd: cluster.target.lnd,
    to: cluster.remote,
  });

  await addPeer({lnd, public_key: remote.public_key, socket: remote.socket});

  const {request} = await createInvoice({tokens, lnd: cluster.remote.lnd});

  try {
    await payViaPaymentRequest({lnd, request});
  } catch (err) {
    equal(err, null, 'Expected no error paying payment request');
  }

  try {
    await probeForRoute({lnd, tokens, destination: remote.public_key});
  } catch (err) {}

  {
    const {nodes} = await getForwardingReputations({lnd});
  }

  await deleteForwardingReputations({lnd});

  {
    const {nodes} = await getForwardingReputations({lnd});

    equal(nodes.length, [].length, 'Reputations should be wiped');
  }

  await cluster.kill({});

  return end();
});
