const {chanFormat} = require('bolt07');

const millitokensPerToken = BigInt(1e3);

/** Hop from RPC Hop details

  {
    amt_to_forward_msat: <Millitokens to Forward String>
    chan_id: <Numeric Format Channel Id String>
    chan_capacity: <Channel Capacity Number>
    expiry: <Timeout Chain Height Number>
    fee_msat: <Fee in Millitokens Number>
    [mpp_record]: {
      payment_addr: <Payment Identifier Buffer>
      total_amt_msat: <Total Payment Millitokens Amount String>
    }
    pub_key: <Next Hop Public Key Hex String>
    tlv_payload: <Has Extra TLV Data Bool>
  }

  @throws
  <Error>

  @returns
  {
    channel: <Standard Format Channel Id String>
    channel_capacity: <Channel Capacity Tokens Number>
    fee: <Fee Number>
    fee_mtokens: <Fee Millitokens String>
    forward: <Forward Tokens Number>
    forward_mtokens: <Forward Millitokens String>
    [public_key]: <Forward Edge Public Key Hex String>
    timeout: <Timeout Block Height Number>
  }
*/
module.exports = hop => {
  if (!hop) {
    throw new Error('ExpectedRpcHopToDeriveHop');
  }

  if (!hop.amt_to_forward_msat) {
    throw new Error('ExpectedAmountToForwardMillisatoshisInRpcHopDetails');
  }

  if (!hop.chan_id) {
    throw new Error('ExpectedNumericChannelIdInRpcHopDetails');
  }

  if (hop.chan_capacity === undefined) {
    throw new Error('ExpectedChannelCapacityTokensNumberInRpcHopDetails');
  }

  if (!hop.expiry) {
    throw new Error('ExpectedHtlcForwardExpiryHeightInRpcHopDetails');
  }

  if (!hop.fee_msat) {
    throw new Error('ExpectedHtlcForwardingMillitokensFeeInRpcHopDetails');
  }

  if (!!hop.mpp_record && !Buffer.isBuffer(hop.mpp_record.payment_addr)) {
    throw new Error('ExpectedMultipathPaymentAddressInRecord');
  }

  if (!!hop.mpp_record && !hop.mpp_record.total_amt_msat) {
    throw new Error('ExpectedMultipathRecordTotalPaymentAmountMillitokens');
  }

  if (!hop.pub_key) {
    throw new Error('ExpectedForwardToPublicKeyInRpcHopDetails');
  }

  if (hop.tlv_payload !== false && hop.tlv_payload !== true) {
    throw new Error('ExpectedTlvPayloadPresenceInRpcHopDetails');
  }

  return {
    channel: chanFormat({number: hop.chan_id}).channel,
    channel_capacity: hop.chan_capacity,
    fee: Number(BigInt(hop.fee_msat) / millitokensPerToken),
    fee_mtokens: hop.fee_msat,
    forward: Number(BigInt(hop.amt_to_forward_msat) / millitokensPerToken),
    forward_mtokens: hop.amt_to_forward_msat,
    public_key: hop.pub_key,
    timeout: hop.expiry,
  };
};
