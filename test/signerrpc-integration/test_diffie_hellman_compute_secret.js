const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {diffieHellmanComputeSecret} = require('./../../');

const all = promise => Promise.all(promise);
const size = 2;

// Computing a shared secret should return the shared secret
test('Diffie Hellman compute secret', async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, id, lnd}, target, remote] = nodes;

  try {
    const [control, {secret}] = await all([
      diffieHellmanComputeSecret({lnd, partner_public_key: target.id}),
      diffieHellmanComputeSecret({lnd: target.lnd, partner_public_key: id}),
    ]);

    equal(control.secret.length, 64, 'Got key back');
    equal(control.secret, secret, 'Key exchange is done');
  } catch (err) {
    strictSame(
      err,
      [400, 'ExpectedLndWithSupportForDeriveSharedKey'],
      'Got err'
    );
  }

  await kill({});

  return end();
});
