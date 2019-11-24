const rpcRouteAsRoute = require('./rpc_route_as_route');

/** Payment attempt from RPC HTLC attempt details

  {
    route: [{
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
      total_amt: <Total Tokens Number>
      total_amt_msat: <Route Total Millitokens String>
      total_fees: <Route Fee Tokens String>
      total_fees_msat: <Route Total Fees Millitokens String>
      total_time_lock: <Route Total Timelock Number>
    }]
    status: <HTLC Status String>
  }

  @throws
  <Error>

  @returns
  {
    is_confirmed: <Payment Attempt Succeeded Bool>
    is_failed: <Payment Attempt Failed Bool>
    is_pending: <Payment Attempt is Waiting For Resolution Bool>
    route: {
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        [public_key]: <Forward Edge Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      [payment]: <Payment Identifier Hex String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
      [total_mtokens]: <Total Payment Millitokens String>
    }
  }
*/
module.exports = attempt => {
  if (!attempt) {
    throw new Error('ExpectedRpcAttemptDetailsToDeriveAttempt');
  }

  if (!attempt.route) {
    throw new Error('ExpectedRouteAttemptedInRpcAttemptDetails');
  }

  if (!attempt.status) {
    throw new Error('ExpectedAttemptStatusInRpcAttemptDetails');
  }

  const isConfirmed = attempt.status === 'SUCCEEDED';
  const isFailed = attempt.status === 'FAILED';
  const isPending = attempt.status === 'IN_FLIGHT';

  return {
    is_confirmed: isConfirmed,
    is_failed: isFailed,
    is_pending: isPending,
    route: rpcRouteAsRoute(attempt.route),
  };
};
