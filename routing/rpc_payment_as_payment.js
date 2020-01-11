const {isArray} = Array;
const msPerSecond = 1e3;
const nanoSecsPerMillisecond = BigInt(1e6);

const rpcAttemptHtlcAsAttempt = require('./rpc_attempt_htlc_as_attempt');

/** Payment details from RPC payment details

  {
    creation_date: <Creation Date Epoch Time Seconds String>
    creation_time_ns: <Creation Date Epoch Time Nanoseconds String>
    fee_msat: <Fee Paid in Millitokens String>
    fee_sat: <Fee Paid in Tokens String>
    htlcs: [{
      attempt_time_ns: <HTLC Sent At Epoch Time Nanoseconds String>
      resolve_time_ns: <HTLC Resolved At Epoch Time Nanoseconds String>
      route: [{
        hops: [{
          amt_to_forward: <Tokens to Forward String>
          amt_to_forward_msat: <Millitokens to Forward String>
          chan_id: <Numeric Format Channel Id String>
          chan_capacity: <Channel Capacity Number>
          expiry: <Timeout Chain Height Number>
          fee: <Fee in Tokens Number>
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
    }]
    path: [<Hop Public Key Hex String>]
    payment_hash: <Preimage SHA256 Hash Hex String>
    payment_preimage: <Payment Secret Preimage Hex String>
    payment_request: <BOLT 11 Payment Request String>
    status: <Payment State String>
    value: <Tokens String>
    value_msat: <Paid Millitokens String>
    value_sat: <Paid Tokens String>
  }

  @throws
  <Error>

  @returns
  {
    attempts: [{
      [confirmed_at]: <Payment Attempt Confirmed At ISO 8601 Date String>
      created_at: <HTLC Sent At ISO 8601 Date String>
      [failed_at]: <Payment Attempt Failed At ISO 8601 Date String>
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
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Fee-Inclusive Millitokens String>
        [payment]: <Payment Identifier Hex String>
        timeout: <Timeout Block Height Number>
        tokens: <Total Fee-Inclusive Tokens Number>
        [total_mtokens]: <Total Millitokens String>
      }
    }]
    created_at: <Payment at ISO-8601 Date String>
    [confirmed_at]: <Payment Confirmed at ISO 8601 Date String>
    destination: <Destination Node Public Key Hex String>
    [failed_at]: <Payment Failed at ISO 8601 Date String>
    fee: <Paid Routing Fee Tokens Number>
    fee_mtokens: <Paid Routing Fee in Millitokens String>
    hops: [<Node Hop Public Key Hex String>]
    id: <Payment Preimage Hash String>
    is_confirmed: <Payment is Confirmed Bool>
    is_outgoing: <Transaction Is Outgoing Bool>
    mtokens: <Millitokens Sent to Destination String>
    [request]: <BOLT 11 Payment Request String>
    secret: <Payment Preimage Hex String>
    tokens: <Tokens Sent to Destination Number>
  }
*/
module.exports = payment => {
  if (!payment) {
    throw new Error('ExpectedPaymentInRpcResponse');
  }

  if (!payment.creation_date) {
    throw new Error('ExpectedCreationDateInRpcPaymentDetails');
  }

  if (typeof payment.fee_sat !== 'string') {
    throw new Error('ExpectedPaymentFeeInRpcPaymentDetails');
  }

  if (!isArray(payment.htlcs)) {
    throw new Error('ExpectedHtlcsArrayInRpcPaymentDetails');
  }

  if (!isArray(payment.path) || !payment.path.length) {
    throw new Error('ExpectedPaymentPathInRpcPaymentDetails');
  }

  payment.path.forEach(key => {
    if (!key) {
      throw new Error('ExpectedPathHopKeyInRpcPaymentDetails');
    }

    return;
  });

  if (!payment.payment_hash) {
    throw new Error('ExpectedPaymentHashInRpcPaymentDetails');
  }

  if (!payment.payment_preimage) {
    throw new Error('ExpectedPaymentPreimageInRpcPaymentDetails');
  }

  if (typeof payment.value_sat !== 'string') {
    throw new Error('ExpectedPaymentValueInRpcPaymentDetails');
  }

  const [destination, ...hops] = payment.path.reverse();

  const creationDateEpochMs = (() => {
    // Exit early when creation time nanoseconds is not defined
    if (payment.creation_time_ns === '0') {
      return Number(payment.creation_date) * msPerSecond;
    }

    return Number(BigInt(payment.creation_time_ns) * nanoSecsPerMillisecond);
  }());

  return {
    destination,
    attempts: payment.htlcs.map(htlc => rpcAttemptHtlcAsAttempt(htlc)),
    created_at: new Date(creationDateEpochMs).toISOString(),
    fee: Number(payment.fee_sat),
    fee_mtokens: !payment.fee_msat ? undefined : payment.fee_msat,
    hops: hops.reverse(),
    id: payment.payment_hash,
    is_confirmed: payment.value_msat !== '0',
    is_outgoing: true,
    mtokens: payment.value_msat,
    request: payment.payment_request || undefined,
    secret: payment.payment_preimage,
    tokens: Number(payment.value_sat),
  };
};
