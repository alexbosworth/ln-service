const {test} = require('tap');

const {delay} = require('./../macros');
const {createCluster} = require('./../macros');
const {getChannel} = require('./../../');
const {openChannel} = require('./../../');
const {updateRoutingFees} = require('./../../');
const {waitForChannel} = require('./../macros');
const {waitForPendingChannel} = require('./../macros');

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

  const channelOpen = await openChannel({
    lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: cluster.target.public_key,
    socket: cluster.target.socket,
  });

  await waitForPendingChannel({lnd, id: channelOpen.transaction_id});

  await cluster.generate({count: confirmationCount, node: cluster.control});

  const {id} = await waitForChannel({lnd, id: channelOpen.transaction_id});

  await delay(3000);

  await updateRoutingFees({
    lnd,
    base_fee_tokens: baseFeeTokens,
    cltv_delta: cltvDelta,
    fee_rate: feeRate,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  const policy = (await getChannel({id, lnd})).policies.find(policy => {
    return policy.public_key === cluster.control.public_key;
  });

  equal(policy.base_fee_mtokens, `${baseFeeTokens * mtokPerTok}`, 'Base fee');
  equal(policy.cltv_delta, cltvDelta, 'CLTV delta updated');
  equal(policy.fee_rate, feeRate, 'Fee rate updated');

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
