const {test} = require('tap');

const {createCluster} = require('./../macros');
const {diffieHellmanComputeSecret} = require('./../../');

const all = promise => Promise.all(promise);

// Computing a shared secret should return the shared secret
test('Diffie Hellman compute secret', async ({deepIs, end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  try {
    const [control, target] = await all([
      diffieHellmanComputeSecret({
        lnd: cluster.control.lnd,
        partner_public_key: cluster.target.public_key,
      }),
      diffieHellmanComputeSecret({
        lnd: cluster.target.lnd,
        partner_public_key: cluster.control.public_key,
      }),
    ]);

    equal(control.secret.length, 64, 'Got key back');
    equal(control.secret, target.secret, 'Key exchange is done');
  } catch (err) {
    deepIs(err, [400, 'ExpectedLndWithSupportForDeriveSharedKey'], 'Got err');
  }

  await cluster.kill({});

  return end();
});
