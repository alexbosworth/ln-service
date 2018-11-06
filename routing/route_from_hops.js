const BN = require('bn.js');

const decBase = 10;
const defaultChannelCapacity = 16777215;
const defaultCltvBuffer = 144;
const defaultFee = 0;
const feeDivisor = new BN(1e6, 10);
const {floor} = Math;
const hopsWithoutFees = 2;
const minFee = 0;
const mtokPerTok = new BN(1e3, 10);

/** Given hops to a destination, construct a payable route

  {
    height: <Current Block Height Number>
    hops: [{
      base_fee_mtokens: <Base Fee Millitokens String>
      [channel_capacity]: <Channel Capacity Tokens Number>
      channel_id: <Channel Id String>
      cltv_delta: <CLTV Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
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
      channel_id: <BOLT 07 Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      fee: <Fee Number>
      fee_mtokens: <Fee Millitokens String>
      forward: <Forward Tokens Number>
      forward_mtokens: <Forward Millitokens String>
      timeout: <Timeout Block Height Number>
    }]
    mtokens: <Total Fee-Inclusive Millitokens String>
    timeout: <Timeout Block Height Number>
    tokens: <Total Fee-Inclusive Tokens Number>
  }
*/
module.exports = ({height, hops, mtokens}) => {
  if (height === undefined) {
    throw new Error('ExpectedChainHeightForRoute');
  }

  if (!Array.isArray(hops) || !hops.length) {
    throw new Error('ExpectedHopsToConstructRouteFrom');
  }

  hops.forEach(hop => {
    if (!hop.base_fee_mtokens) {
      throw new Error('ExpectedHopBaseFeeMillitokensForRouteConstruction');
    }

    if (!hop.channel_id) {
      throw new Error('ExpectedHopChannelIdForRouteConstruction');
    }

    if (hop.cltv_delta === undefined) {
      throw new Error('ExpectedHopCltvForRouteConstruction');
    }

    if (hop.fee_rate === undefined) {
      throw new Error('ExpectedHopFeeRateForRouteConstruction');
    }

    return;
  });

  if (!mtokens) {
    throw new Error('ExpectedMillitokensToSendAcrossHops');
  }

  const delay = hops.map(n => n.cltv_delta).reduce((sum, n) => sum + n);
  const [firstHop] = hops;
  const [lastHop] = hops.slice().reverse();
  const routeHops = [];

  const total = hops.slice().reverse().reduce((sum, hop, i) => {
    const baseFee = new BN(hop.base_fee_mtokens, decBase);
    const feeRate = new BN(hop.fee_rate, decBase);

    const fees = baseFee.add(sum.clone().div(feeDivisor).mul(feeRate));

    routeHops.push({
      channel_capacity: hop.channel_capacity || defaultChannelCapacity,
      channel_id: hop.channel_id,
      cltv_delta: hop.cltv_delta,
      fee: !i ? defaultFee : floor(fees.div(mtokPerTok).toNumber()),
      fee_mtokens: !i ? defaultFee.toString() : fees.toString(),
    });

    return !i ? sum : sum.add(fees);
  },
  new BN(mtokens, decBase));

  const totalFees = total.sub(new BN(mtokens, decBase));

  routeHops.forEach((hop, i) => {
    if (i < hopsWithoutFees) {
      hop.forward = new BN(mtokens, decBase).div(mtokPerTok).toNumber();
      hop.forward_mtokens = mtokens;
      hop.timeout = height + defaultCltvBuffer;

      delete hop.cltv_delta;

      return;
    }

    const prevHop = routeHops[i - [hop].length];

    hop.timeout = prevHop.timeout + hop.cltv_delta;

    delete hop.cltv_delta;

    const prevFee = new BN(prevHop.fee_mtokens, decBase);
    const prevForward = new BN(prevHop.forward_mtokens, decBase);

    hop.forward = floor(prevForward.add(prevFee).div(mtokPerTok).toNumber());
    hop.forward_mtokens = prevForward.add(prevFee).toString();

    return;
  });

  const [firstRouteHop] = routeHops.slice().reverse();

  return {
    fee: floor(totalFees.div(mtokPerTok).toNumber()),
    fee_mtokens: totalFees.toString(),
    hops: routeHops.slice().reverse(),
    mtokens: total.toString(),
    timeout: firstRouteHop.timeout + firstHop.cltv_delta,
    tokens: floor(total.div(mtokPerTok).toNumber()),
  };
};

