const {test} = require('tap');

const {createCluster} = require('./../macros');
const {getChannel} = require('./../../');
const {getChannels} = require('./../../');
const {setupChannel} = require('./../macros');

const confirmationCount = 20;
const {ceil} = Math;

// Getting a channel should return channel details from the channel graph
test(`Get channel`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  await setupChannel({lnd, generate: cluster.generate, to: cluster.target});

  const [channel] = (await getChannels({lnd})).channels;

  const details = await getChannel({lnd, id: channel.id});

  equal(details.capacity, channel.capacity, 'Capacity');
  equal(details.policies.length, [cluster.control, cluster.target].length);

  details.policies.forEach(policy => {
    equal(policy.base_fee_mtokens, '1000', 'Base fee mtokens');
    equal(policy.cltv_delta, 40, 'CLTV policy');
    equal(policy.fee_rate, 1, 'Fee rate');
    equal(policy.is_disabled, false, 'Disabled flag');
    equal(policy.max_htlc_mtokens, `${ceil(details.capacity * 0.99)}000`);
    equal(!!policy.min_htlc_mtokens, true, 'Min HTLC value');
    equal(policy.public_key.length, 66, 'Policy public key');
    equal(Date.now() - new Date(policy.updated_at) < 1e5, true, 'Updated at');

    return;
  });

  equal(details.transaction_id, channel.transaction_id, 'Funding tx id');
  equal(details.transaction_vout, channel.transaction_vout, 'Funding tx vout');

  equal(Date.now() - new Date(details.updated_at) < 1e5, true, 'Updated at');

  await cluster.kill({});

  return end();
});
