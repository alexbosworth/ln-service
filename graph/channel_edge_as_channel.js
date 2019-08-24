const {chanFormat} = require('bolt07');
const {isFinite} = require('lodash');

const asDate = epochTime => new Date(epochTime * 1e3).toISOString();
const decBase = 10;
const msPerSec = 1e3;
const separatorChar = ':';

/** Channel edge as channel

  {
    capacity: <Capacity Tokens String>
    chan_point: <Channel Funding Outpoint String>
    channel_id: <Numeric Channel Id String>
    last_update: <Last Update Time Unix Time Number>
    node1_policy: {
      disabled: <Forwarding is Disabled Bool>
      fee_base_msat: <Base Fee Tokens String>
      fee_rate_milli_msat: <Fee Rate Number String>
      [last_update]: <Last Update Epoch Time Seconds Number>
      max_htlc_msat: <Maximum HTLC Millitokens String>
      min_htlc: <Minimum HTLC Millitokens String>
      time_lock_delta: <CLTV Delta Number>
    }
    node1_pub: <Lexical Order First Node Public Key Hex String>
    node2_policy: {
      disabled: <Forwarding is Disabled Bool>
      fee_base_msat: <Base Fee Tokens String>
      fee_rate_milli_msat: <Fee Rate Number String>
      [last_update]: <Last Update Epoch Time Seconds Number>
      max_htlc_msat: <Maximum HTLC Millitokens String>
      min_htlc: <Minimum HTLC Millitokens String>
      time_lock_delta: <CLTV Delta Number>
    }
    node2_pub: <Lexical Order Second Node Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    capacity: <Maximum Tokens Number>
    id: <Standard Format Channel Id String>
    policies: [{
      [base_fee_mtokens]: <Base Fee Millitokens String>
      [cltv_delta]: <Locktime Delta Number>
      [fee_rate]: <Fees Charged Per Million Tokens Number>
      [is_disabled]: <Channel Is Disabled Bool>
      [max_htlc_mtokens]: <Maximum HTLC Millitokens Value String>
      [min_htlc_mtokens]: <Minimum HTLC Millitokens Value String>
      public_key: <Node Public Key String>
      [updated_at]: <Edge Last Updated At ISO 8601 Date String>
    }]
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
    [updated_at]: <Channel Last Updated At ISO 8601 Date String>
  }
*/
module.exports = args => {
  if (!args.capacity) {
    throw new Error('ExpectedChannelCapacityInChannelEdgeResponse');
  }

  if (!args.chan_point) {
    throw new Error('ExpectedChannelOutpointInChannelEdgeResponse');
  }

  if (!args.channel_id) {
    throw new Error('ExpectedChannelIdInChannelEdgeResponse');
  }

  try {
    chanFormat({number: args.channel_id});
  } catch (err) {
    throw new Error('ExpectedNumericFormatChannelIdInChannelEdgeResponse');
  }

  if (args.last_update === undefined) {
    throw new Error('ExpectedChannelLastUpdate');
  }

  if (!!args.node1_policy) {
    if (args.node1_policy.disabled === undefined) {
      throw new Error('ExpectedChannelNode1DisabledStatus');
    }

    if (!args.node1_policy.fee_base_msat) {
      throw new Error('ExpectedChannelNode1PolicyBaseFee');
    }

    if (!args.node1_policy.fee_rate_milli_msat) {
      throw new Error('ExpectedChannelNode1FeeRate');
    }

    if (!args.node1_policy.min_htlc) {
      throw new Error('ExpectedChannelNode1PolicyMinimumHtlcValue');
    }

    if (args.node1_policy.time_lock_delta === undefined) {
      throw new Error('ExpectedChannelNode1TimelockDelta');
    }
  }

  if (!args.node1_pub) {
    throw new Error('ExpectedChannelNode1PublicKey');
  }

  if (!!args.node2_policy) {
    if (!args.node2_policy) {
      throw new Error('ExpectedNode2PolicyInChannelResponse');
    }

    if (args.node2_policy.time_lock_delta === undefined) {
      throw new Error('ExpectedChannelNode2TimelockDelta');
    }

    if (!args.node2_policy.min_htlc) {
      throw new Error('ExpectedChannelNode2PolicyMinimumHtlcValue');
    }

    if (!args.node2_policy.fee_base_msat) {
      throw new Error('ExpectedChannelNode2PolicyBaseFee');
    }

    if (!args.node2_policy.fee_rate_milli_msat) {
      throw new Error('ExpectedChannelNode2FeeRate');
    }

    if (args.node2_policy.disabled === undefined) {
      throw new Error('ExpectedChannelNode2DisabledStatus');
    }
  }

  if (!args.node2_pub) {
    throw new Error('ExpectedChannelNodePublicKey');
  }

  const [transactionId, vout] = args.chan_point.split(separatorChar);
  const updatedAt = args.last_update * msPerSec;

  if (!transactionId) {
    throw new Error('ExpectedTransactionIdForChannelOutpoint');
  }

  if (!isFinite(parseInt(vout, decBase))) {
    throw new Error('ExpectedTransactionVoutForChannelOutpoint');
  }

  const policies = [args.node1_policy, args.node2_policy].map(policy => {
    if (!policy) {
      return {};
    }

    return {
      base_fee_mtokens: policy.fee_base_msat,
      cltv_delta: policy.time_lock_delta,
      fee_rate: parseInt(policy.fee_rate_milli_msat, decBase),
      is_disabled: policy.disabled,
      max_htlc_mtokens: policy.max_htlc_msat,
      min_htlc_mtokens: policy.min_htlc,
      updated_at: !policy.last_update ? undefined : asDate(policy.last_update),
    };
  });

  const [node1Policy, node2Policy] = policies;

  node1Policy.public_key = args.node1_pub;
  node2Policy.public_key = args.node2_pub;

  return {
    policies: [node1Policy, node2Policy],
    id: chanFormat({number: args.channel_id}).channel,
    capacity: parseInt(args.capacity, decBase),
    transaction_id: transactionId,
    transaction_vout: parseInt(vout, decBase),
    updated_at: !updatedAt ? undefined : new Date(updatedAt).toISOString(),
  };
};
