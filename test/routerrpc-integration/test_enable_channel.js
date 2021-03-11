const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {disableChannel} = require('./../../');
const {enableChannel} = require('./../../');
const {getChannel} = require('./../../');
const {setupChannel} = require('./../macros');

// Enabling a channel should mark it as enabled
test(`Enable channel`, async ({end, equal}) => {
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

    // Channel gets disabled
    {
      const details = await getChannel({lnd, id: channel.id});

      const policy = details.policies.find(policy => {
        return policy.public_key === cluster.control.public_key
      });

      equal(policy.is_disabled, true, 'Forwarding policy is disabled');
    }

    await enableChannel({
      lnd,
      transaction_id: channel.transaction_id,
      transaction_vout: channel.transaction_vout,
    });

    // Channel should be enabled now
    {
      const details = await getChannel({lnd, id: channel.id});

      const policy = details.policies.find(policy => {
        return policy.public_key === cluster.control.public_key
      });

      equal(policy.is_disabled, false, 'Forwarding policy is enabled');
    }
  } catch (err) {
    const [code] = err;

    equal(code, 501, 'Method not supported yet');
  }

  await cluster.kill({});

  return end();
});
