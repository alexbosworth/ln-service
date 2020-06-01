const {chanFormat} = require('bolt07');

const channelPolicyAsPolicy = require('./channel_policy_as_policy');

const separatorChar = ':';

/** Channel edge as channel

  {
    capacity: <Capacity Tokens String>
    chan_point: <Channel Funding Outpoint String>
    channel_id: <Numeric Channel Id String>
    node1_policy: {
      disabled: <Forwarding is Disabled Bool>
      fee_base_msat: <Base Fee Tokens String>
      fee_rate_milli_msat: <Fee Rate Number String>
      last_update: <Last Update Epoch Time Seconds Number>
      max_htlc_msat: <Maximum HTLC Millitokens String>
      min_htlc: <Minimum HTLC Millitokens String>
      time_lock_delta: <CLTV Delta Number>
    }
    node1_pub: <Lexical Order First Node Public Key Hex String>
    node2_policy: {
      disabled: <Forwarding is Disabled Bool>
      fee_base_msat: <Base Fee Tokens String>
      fee_rate_milli_msat: <Fee Rate Number String>
      last_update: <Last Update Epoch Time Seconds Number>
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
      [fee_rate]: <Fees Charged in Millitokens Per Million Number>
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

  if (!args.node1_pub) {
    throw new Error('ExpectedChannelNode1PublicKey');
  }

  if (!args.node2_pub) {
    throw new Error('ExpectedChannelNode2PublicKey');
  }

  const [transactionId, vout] = args.chan_point.split(separatorChar);

  if (!transactionId) {
    throw new Error('ExpectedTransactionIdForChannelOutpoint');
  }

  if (!vout) {
    throw new Error('ExpectedTransactionVoutForChannelOutpoint');
  }

  const publicKeys = [args.node1_pub, args.node2_pub];

  const policies = [args.node1_policy, args.node2_policy].map((policy, i) => {
    return channelPolicyAsPolicy({policy, public_key: publicKeys[i]});
  });

  const [node1Policy, node2Policy] = policies;
  const policiesUpdated = policies.map(n => n.updated_at).filter(n => !!n);

  const [updatedAt] = policiesUpdated.sort().reverse();

  return {
    id: chanFormat({number: args.channel_id}).channel,
    capacity: Number(args.capacity),
    policies: [node1Policy, node2Policy],
    transaction_id: transactionId,
    transaction_vout: Number(vout),
    updated_at: updatedAt,
  };
};
