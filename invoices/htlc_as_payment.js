const {chanFormat} = require('bolt07');

const {htlcStates} = require('./constants');

const dateFrom = n => new Date(1e3 * n).toISOString();
const decBase = 10;
const mtokensPerToken = BigInt(1e3);

/** Convert raw API HTLC response to payment attributes

  {
    accept_height: <HTLC Held Since Height Number>
    accept_time: <HTLC Held Since Epoch Time Number String>
    amt_msat: <HTLC Amount Millitokens String>
    chan_id: <Numeric Channel Id String>
    expiry_height: <HTLC CLTV Expiration Height Number>
    htlc_index: <Channel HTLC Index Number String>
    mpp_total_amt_msat: <Total Payment Millitokens String>
    resolve_time: <HTLC Removed At Epoch Time Number String>
    state: <HTLC Lifecycle State String>
  }

  @throws
  <Error>

  @returns
  {
    [confirmed_at]: <Payment Settled At ISO 8601 Date String>
    created_at: <Payment Held Since ISO 860 Date String>
    created_height: <Payment Held Since Block Height Number>
    in_channel: <Incoming Payment Through Channel Id String>
    is_canceled: <Payment is Canceled Bool>
    is_confirmed: <Payment is Confirmed Bool>
    is_held: <Payment is Held Bool>
    mtokens: <Incoming Payment Millitokens String>
    [pending_index]: <Pending Payment Channel HTLC Index Number>
    timeout: <HTLC CLTV Timeout Height>
    tokens: <Payment Tokens Number>
    [total_mtokens]: <Total Millitokens String>
  }
*/
module.exports = args => {
  if (!args.accept_height) {
    throw new Error('ExpectedAcceptHeightInResponseHtlc');
  }

  if (!args.accept_time) {
    throw new Error('ExpectedAcceptTimeInResponseHtlc');
  }

  if (!args.amt_msat) {
    throw new Error('ExpectedPaymentAmountInResponseHtlc');
  }

  if (!args.chan_id) {
    throw new Error('ExpectedChannelIdInResponseHtlc');
  }

  if (!args.expiry_height) {
    throw new Error('ExpectedHtlcExpiryHeightInResponseHtlc');
  }

  if (!args.htlc_index) {
    throw new Error('ExpectedHtlcIndexInResponseHtlc');
  }

  if (args.resolve_time === undefined) {
    throw new Error('ExpectedResolveTimeInResponseHtlc');
  }

  if (!args.state) {
    throw new Error('ExpectedHtlcStateInResponseHtlc');
  }

  const isAccepted = args.state === htlcStates.accepted;
  const isCanceled = args.state === htlcStates.canceled;
  const isReceived = args.state === htlcStates.received;
  const totalMtokens = args.mpp_total_amt_msat;

  return {
    canceled_at: !isCanceled ? undefined : dateFrom(args.resolve_time),
    confirmed_at: !isReceived ? undefined : dateFrom(args.resolve_time),
    created_at: dateFrom(args.accept_time),
    created_height: args.accept_height,
    in_channel: chanFormat({number: args.chan_id}).channel,
    is_canceled: isCanceled,
    is_confirmed: isReceived,
    is_held: isAccepted,
    mtokens: args.amt_msat,
    pending_index: isAccepted ? parseInt(args.htlc_index, decBase) : undefined,
    timeout: args.expiry_height,
    tokens: Number(BigInt(args.amt_msat) / mtokensPerToken),
    total_mtokens: totalMtokens === '0' ? undefined : totalMtokens,
  };
};
