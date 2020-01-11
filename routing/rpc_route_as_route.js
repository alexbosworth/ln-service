const rpcHopAsHop = require('./rpc_hop_as_hop');

const {isArray} = Array;
const millitokensPerToken = BigInt(1e3);

/** Route from RPC route

  {
    hops: [{
      amt_to_forward_msat: <Millitokens to Forward String>
      chan_id: <Numeric Format Channel Id String>
      chan_capacity: <Channel Capacity Number>
      expiry: <Timeout Chain Height Number>
      fee_msat: <Fee in Millitokens Number>
      [mpp_record]: {
        payment_addr: <Payment Identifier Buffer>
        total_amt_msat: <Total Payment Millitokens Amount String>
      }
      [pub_key]: <Next Hop Public Key Hex String>
      tlv_payload: <Has Extra TLV Data Bool>
    }]
    total_amt_msat: <Route Total Millitokens String>
    total_fees_msat: <Route Total Fees Millitokens String>
    total_time_lock: <Route Total Timelock Number>
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
      fee: <Fee Tokens Number>
      fee_mtokens: <Fee Millitokens String>
      forward: <Forward Tokens Number>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Forward Edge Public Key Hex String>
      timeout: <Timeout Block Height Number>
    }]
    mtokens: <Total Fee-Inclusive Millitokens String>
    [payment]: <Payment Identifier Hex String>
    [timeout]: <Timeout Block Height Number>
    tokens: <Total Fee-Inclusive Tokens Number>
    [total_mtokens]: <Total Payment Millitokens String>
  }
*/
module.exports = route => {
  if (!route) {
    throw new Error('ExpectedRpcRouteToDeriveRouteDetailsFor');
  }

  if (!isArray(route.hops)) {
    throw new Error('ExpectedRouteHopsArrayInRpcRouteDetails');
  }

  if (!isArray(route.hops)) {
    throw new Error('ExpectedRouteHopsInRpcRouteDetails');
  }

  if (!route.total_amt_msat) {
    throw new Error('ExpectedTotalForwardAmountMillitokensValueForRoute');
  }

  if (!route.total_fees_msat) {
    throw new Error('ExpectedTotalRoutingFeesInRpcRouteDetails');
  }

  const [finalHop] = route.hops.slice().reverse();

  const mpp = (finalHop || {}).mpp_record || {};

  return {
    fee: Number(BigInt(route.total_fees_msat) / millitokensPerToken),
    fee_mtokens: route.total_fees_msat,
    hops: route.hops.map(hop => rpcHopAsHop(hop)),
    mtokens: route.total_amt_msat,
    payment: !!mpp.payment_addr ? mpp.payment_addr.toString('hex') : undefined,
    timeout: route.total_time_lock || undefined,
    tokens: Number(BigInt(route.total_amt_msat) / millitokensPerToken),
    total_mtokens: !!mpp.total_amt_msat ? mpp.total_amt_msat : undefined,
  };
};
