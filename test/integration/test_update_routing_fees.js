const {test} = require('tap');

const {delay} = require('./../macros');
const {createCluster} = require('./../macros');
const {getChannel} = require('./../../');
const {setupChannel} = require('./../macros');
const {updateRoutingFees} = require('./../../');

const baseFeeTokens = 9;
const channelCapacityTokens = 1e6;
const cltvDelta = 10;
const confirmationCount = 6;
const defaultFee = 1e3;
const feeRate = 11;
const giftTokens = 1e5;
const mtokPerTok = 1e3;
const n = 2;

// Updating routing fees should update routing fees
test(`Update routing fees`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const channelOpen = await setupChannel({
    lnd,
    generate: cluster.generate,
    to: cluster.target,
  });

  const {id} = channelOpen;

  await updateRoutingFees({
    lnd,
    base_fee_tokens: baseFeeTokens,
    cltv_delta: cltvDelta,
    fee_rate: feeRate,
    max_htlc_mtokens: '10000',
    min_htlc_mtokens: '2000',
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  const policy = (await getChannel({id, lnd})).policies.find(policy => {
    return policy.public_key === cluster.control.public_key;
  });

  equal(policy.base_fee_mtokens, `${baseFeeTokens * mtokPerTok}`, 'Base fee');
  equal(policy.cltv_delta, cltvDelta, 'CLTV delta updated');
  equal(policy.fee_rate, feeRate, 'Fee rate updated');

  // LND 0.7.1 and below do not support updating max htlc mtokens
  if (policy.max_htlc_mtokens !== '990000000') {
    equal(policy.max_htlc_mtokens, '10000', 'Max HTLC tokens updated');
  }

  // LND 0.8.2 and below do not support updating min htlc mtokens
  if (policy.min_htlc_mtokens !== '1000') {
    equal(policy.min_htlc_mtokens, '2000', 'Min HTLC tokens updated');
  }

  {
    const lnd = cluster.target.lnd;

    await updateRoutingFees({
      lnd,
      base_fee_tokens: baseFeeTokens * n,
      cltv_delta: cltvDelta * n,
      fee_rate: feeRate * n,
    });

    const policy = (await getChannel({id, lnd})).policies.find(policy => {
      return policy.public_key === cluster.target.public_key;
    });

    equal(policy.base_fee_mtokens, `${baseFeeTokens*mtokPerTok*n}`, 'Basefee');
    equal(policy.cltv_delta, cltvDelta*n, 'Global CLTV delta updated');
    equal(policy.fee_rate, feeRate*n, 'Global Fee rate updated');
  }

  await cluster.kill({});

  return end();
});
