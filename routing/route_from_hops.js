const asTokens = require('./as_tokens');
const policyFee = require('./policy_fee');

const defaultCltvBuffer = 144;
const {isArray} = Array;
const minCltv = 0;
const minFee = 0;

/** Given hops to a destination, construct a payable route

  {
    [cltv]: <Final Cltv Delta Number>
    height: <Current Block Height Number>
    hops: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel: <Standard Format Channel Id String>
      [channel_capacity]: <Channel Capacity Tokens Number>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Next Hop Public Key Hex String>
    }]
    mtokens: <Millitokens To Send String>
  }

  @throws
  <Error>

  @returns
  {
    fee: <Route Fee Tokens Number>
    fee_mtokens: <Route Fee Millitokens String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      fee: <Fee Number>
      fee_mtokens: <Fee Millitokens String>
      forward: <Forward Tokens Number>
      forward_mtokens: <Forward Millitokens String>
      [public_key]: <Public Key Hex String>
      timeout: <Timeout Block Height Number>
    }]
    mtokens: <Total Fee-Inclusive Millitokens String>
    timeout: <Timeout Block Height Number>
    tokens: <Total Fee-Inclusive Tokens Number>
  }
*/
module.exports = ({cltv, height, hops, mtokens}) => {
  const finalCltvDelta = cltv || defaultCltvBuffer;

  if (height === undefined) {
    throw new Error('ExpectedChainHeightForRoute');
  }

  if (!isArray(hops) || !hops.length) {
    throw new Error('ExpectedHopsToConstructRouteFrom');
  }

  if (!mtokens) {
    throw new Error('ExpectedMillitokensToSendAcrossHops');
  }

  // Check hops for validity
  hops.forEach(hop => {
    if (!hop.base_fee_mtokens) {
      throw new Error('ExpectedHopBaseFeeMillitokensForRouteConstruction');
    }

    if (!hop.channel) {
      throw new Error('ExpectedHopChannelIdForRouteConstruction');
    }

    if (hop.cltv_delta === undefined) {
      throw new Error('ExpectedHopCltvForRouteConstruction');
    }

    if (hop.fee_rate === undefined) {
      throw new Error('ExpectedHopFeeRateForRouteConstruction');
    }

    if (!hop.public_key) {
      throw new Error('ExpectedHopNextPublicKeyForRouteConstruction');
    }

    return;
  });

  let forwardMtokens = BigInt(mtokens);
  let nextFeeTokens = BigInt(minFee);
  let timeoutHeight = height + finalCltvDelta;

  // To construct the route, we need to go backwards from the end
  const backwardsPath = hops.slice().reverse().map((hop, i) => {
    const policy = {
      base_fee_mtokens: hop.base_fee_mtokens,
      fee_rate: hop.fee_rate,
    };

    const cltvDelta = !i ? minCltv : hop.cltv_delta;
    const feeMtokens = nextFeeTokens;

    const routeHop = {
      channel: hop.channel,
      channel_capacity: hop.channel_capacity,
      fee: asTokens({mtokens: feeMtokens}).tokens,
      fee_mtokens: feeMtokens.toString(),
      forward: asTokens({mtokens: forwardMtokens}).tokens,
      forward_mtokens: forwardMtokens.toString(),
      public_key: hop.public_key,
      timeout: timeoutHeight,
    };

    const fee = policyFee({policy, mtokens: forwardMtokens});
    timeoutHeight += !i ? minCltv : hop.cltv_delta;

    forwardMtokens += feeMtokens;
    nextFeeTokens = BigInt(fee.fee_mtokens);

    return routeHop;
  });

  const totalFeeMtokens = backwardsPath
    .map(n => BigInt(n.fee_mtokens))
    .reduce((sum, n) => sum + n, BigInt(minFee));

  const totalMtokens = totalFeeMtokens + BigInt(mtokens);

  return {
    fee: asTokens({mtokens: totalFeeMtokens}).tokens,
    fee_mtokens: totalFeeMtokens.toString(),
    hops: backwardsPath.slice().reverse(),
    mtokens: totalMtokens.toString(),
    timeout: timeoutHeight,
    tokens: asTokens({mtokens: totalMtokens}).tokens,
  };
};
