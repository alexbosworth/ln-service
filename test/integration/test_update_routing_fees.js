const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getChannel} = require('./../../');
const {setupChannel} = require('./../macros');
const {updateRoutingFees} = require('./../../');

const baseFeeTokens = 9;
const channelCapacityTokens = 1e6;
const cltvDelta = 18;
const confirmationCount = 6;
const defaultFee = 1e3;
const feeRate = 0;
const giftTokens = 1e5;
const mtokPerTok = 1e3;
const n = 2;
const size = 2;

// Updating routing fees should update routing fees
test(`Update routing fees`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = control;

  const channelOpen = await setupChannel({generate, lnd, to: target});

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
    return policy.public_key === control.id;
  });

  equal(policy.base_fee_mtokens, `${baseFeeTokens * mtokPerTok}`, 'Base fee');
  equal(policy.cltv_delta, cltvDelta, 'CLTV delta updated');
  equal(policy.fee_rate, feeRate, 'Fee rate updated');
  equal(policy.max_htlc_mtokens, '10000', 'Max HTLC tokens updated');
  equal(policy.min_htlc_mtokens, '2000', 'Min HTLC tokens updated');

  const {failures} = await updateRoutingFees({
    lnd,
    base_fee_mtokens: `${BigInt(baseFeeTokens) * BigInt(n) * BigInt(1e3)}`,
    cltv_delta: cltvDelta * n,
    fee_rate: feeRate * n,
    transaction_id: '1234000000000000000000000000000000000000000000000000000000000000',
    transaction_vout: 1,
  });

  const expectedFailures = [{
    failure: 'not found',
    is_pending_channel: false,
    is_unknown_channel: true,
    is_invalid_policy: false,
    transaction_id: '1234000000000000000000000000000000000000000000000000000000000000',
    transaction_vout: 1,
  }];

  // Failures is not supported on LND 0.13.4 and below
  if (!!failures.length) {
    strictSame(failures, expectedFailures, 'Got expected failures');
  }

  {
    const lnd = target.lnd;

    await updateRoutingFees({
      lnd,
      base_fee_mtokens: `${BigInt(baseFeeTokens) * BigInt(n) * BigInt(1e3)}`,
      cltv_delta: cltvDelta * n,
      fee_rate: feeRate * n,
    });

    const policy = (await getChannel({id, lnd})).policies.find(policy => {
      return policy.public_key === target.id;
    });

    equal(policy.base_fee_mtokens, `${baseFeeTokens*mtokPerTok*n}`, 'Base');
    equal(policy.cltv_delta, cltvDelta*n, 'Global CLTV delta updated');
    equal(policy.fee_rate, feeRate*n, 'Global Fee rate updated');
  }

  await kill({});

  return end();
});
