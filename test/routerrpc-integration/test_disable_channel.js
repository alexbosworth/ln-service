const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {disableChannel} = require('./../../');
const {getChannel} = require('./../../');
const {setupChannel} = require('./../macros');

// Disabling a channel should mark it as disabled
test(`Disable channel`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channel = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  try {
    await disableChannel({
      lnd,
      transaction_id: channel.transaction_id,
      transaction_vout: channel.transaction_vout,
    });

    const details = await getChannel({lnd, id: channel.id});

    const policy = details.policies.find(policy => {
      return policy.public_key === cluster.control.public_key
    });

    equal(policy.is_disabled, true, 'Forwarding policy is disabled');
  } catch (err) {
    const [code] = err;

    equal(code, 501, 'Method not supported yet');
  }

  await cluster.kill({});

  return end();
});
