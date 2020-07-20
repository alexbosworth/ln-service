const asTokens = require('./as_tokens');
const policyFee = require('./policy_fee');

const defaultCltvBuffer = 40;
const {isArray} = Array;
const minCltv = 0;
const minFee = 0;

/** Given hops to a destination, construct a payable route

  {
    [cltv_delta]: <Final Cltv Delta Number>
    height: <Current Block Height Number>
    hops: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      channel: <Standard Format Channel Id String>
      [channel_capacity]: <Channel Capacity Tokens Number>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Next Hop Public Key Hex String>
    }]
    initial_cltv: <Initial CLTV Delta Number>
    [messages]: [{
      type: <Message Type Number String>
      value: <Message Raw Value Hex Encoded String>
    }]
    mtokens: <Millitokens To Send String>
    [payment]: <Payment Identification Value Hex String>
    [total_mtokens]: <Total Millitokens For Sharded Payments String>
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
    [messages]: [{
      type: <Message Type Number String>
      value: <Message Raw Value Hex Encoded String>
    }]
    mtokens: <Total Fee-Inclusive Millitokens String>
    [payment]: <Payment Identification Value Hex String>
    timeout: <Timeout Block Height Number>
    tokens: <Total Fee-Inclusive Tokens Number>
    [total_mtokens]: <Sharded Payments Total Millitokens String>
  }
*/
module.exports = args => {
  const {height, hops, mtokens} = args;

  const finalCltvDelta = args.cltv_delta || defaultCltvBuffer;

  if (height === undefined) {
    throw new Error('ExpectedChainHeightForRoute');
  }

  if (!isArray(hops) || !hops.length) {
    throw new Error('ExpectedHopsToConstructRouteFrom');
  }

  if (!args.initial_cltv) {
    throw new Error('ExpectedInitialCltvDeltaToConstructRouteFromHops');
  }

  if (!mtokens) {
    throw new Error('ExpectedMillitokensToSendAcrossHops');
  }

  // Check hops for validity
  hops.forEach((hop, i) => {
    if (hop.base_fee_mtokens === undefined) {
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
  const [firstHop] = hops.slice();
  let timeoutHeight = height + finalCltvDelta;

  // To construct the route, we need to go backwards from the end
  const backwardsPath = hops.slice().reverse().map((hop, i, hops) => {
    let feeMtokens = BigInt(minFee);

    if (!!i) {
      const forward = policyFee({policy: hops[i-1], mtokens: forwardMtokens});

      feeMtokens = BigInt(forward.fee_mtokens);
    }

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

    forwardMtokens += feeMtokens;
    timeoutHeight += !i || i === hops.length - 1 ? minCltv : hop.cltv_delta;

    return routeHop;
  });

  const totalFeeMtokens = backwardsPath
    .map(n => BigInt(n.fee_mtokens))
    .reduce((sum, n) => sum + n, BigInt(minFee));

  const totalMtokens = totalFeeMtokens + BigInt(mtokens);

  if (hops.length === 1) {
    timeoutHeight -= args.initial_cltv;
  }

  return {
    fee: asTokens({mtokens: totalFeeMtokens}).tokens,
    fee_mtokens: totalFeeMtokens.toString(),
    hops: backwardsPath.slice().reverse(),
    messages: args.messages,
    mtokens: totalMtokens.toString(),
    payment: args.payment,
    timeout: timeoutHeight + args.initial_cltv,
    tokens: asTokens({mtokens: totalMtokens}).tokens,
    total_mtokens: args.total_mtokens,
  };
};
