const {isFinite} = require('lodash');

const decBase = 10;
const msPerSec = 1e3;
const separatorChar = ':';

/** Get a channel

  {
    id: <Channel Id String>
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    capacity: <Maximum Tokens Number>
    policies: [{
      base_fee_mtokens: <Base Fee MilliTokens String>
      cltv_delta: <Locktime Delta Number>
      fee_rate: <Fees Charged Per Million Number>
      is_disabled: <Channel Is Disabled Bool>
      minimum_htlc_mtokens: <Minimum HTLC MilliTokens Value String>
      public_key: <Node Public Key String>
    }]
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
    update_at: <Channel Last Updated At ISO 8601 Date String>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  if (!id) {
    return cbk([400, 'ExpectedChannelIdToGet']);
  }

  if (!lnd || !lnd.getChanInfo) {
    return cbk([400, 'ExpectedLndToGetChannelDetails']);
  }

  return lnd.getChanInfo({chan_id: id}, (err, response) => {
    if (!!err) {
      return cbk([503, 'UnexpectedGetChannelInfoError', err]);
    }

    if (!response) {
      return cbk([503, 'ExpectedGetChannelResponse']);
    }

    if (!response.capacity) {
      return cbk([503, 'ExpectedChannelCapacity']);
    }

    if (!response.chan_point) {
      return cbk([503, 'ExpectedChannelOutpoint']);
    }

    if (!response.last_update) {
      return cbk([503, 'ExpectedChannelLastUpdate']);
    }

    if (!response.node1_pub) {
      return cbk([503, 'ExpectedChannelNodePublicKey']);
    }

    if (response.node1_policy.time_lock_delta === undefined) {
      return cbk([503, 'ExpectedChannelNodeTimelockDelta']);
    }

    if (!response.node1_policy.min_htlc) {
      return cbk([503, 'ExpectedChannelNodePolicyMinimumHtlcValue']);
    }

    if (!response.node1_policy.fee_base_msat) {
      return cbk([503, 'ExpectedChannelNodePolicyBaseFee']);
    }

    if (!response.node1_policy.fee_rate_milli_msat) {
      return cbk([503, 'ExpectedChannelNodeFeeRate']);
    }

    if (response.node1_policy.disabled === undefined) {
      return cbk([503, 'ExpectedChannelNodeDisabledStatus']);
    }

    if (!response.node2_pub) {
      return cbk([503, 'ExpectedChannelNodePublicKey']);
    }

    if (response.node2_policy.time_lock_delta === undefined) {
      return cbk([503, 'ExpectedChannelNodeTimelockDelta']);
    }

    if (!response.node2_policy.min_htlc) {
      return cbk([503, 'ExpectedChannelNodePolicyMinimumHtlcValue']);
    }

    if (!response.node2_policy.fee_base_msat) {
      return cbk([503, 'ExpectedChannelNodePolicyBaseFee']);
    }

    if (!response.node2_policy.fee_rate_milli_msat) {
      return cbk([503, 'ExpectedChannelNodeFeeRate']);
    }

    if (response.node2_policy.disabled === undefined) {
      return cbk([503, 'ExpectedChannelNodeDisabledStatus']);
    }

    const [transactionId, vout] = response.chan_point.split(separatorChar);

    if (!transactionId) {
      return cbk([503, 'ExpectedTransactionId']);
    }

    if (!isFinite(parseInt(vout, decBase))) {
      return cbk([503, 'ExpectedVout']);
    }

    const firstPolicy = response.node1_policy;
    const secondPolicy = response.node2_policy;

    return cbk(null, {
      capacity: parseInt(response.capacity, decBase),
      policies: [
        {
          base_fee_mtokens: firstPolicy.fee_base_msat,
          cltv_delta: firstPolicy.time_lock_delta,
          fee_rate: parseInt(firstPolicy.fee_rate_milli_msat, decBase),
          is_disabled: firstPolicy.disabled,
          minimum_htlc_mtokens: parseInt(firstPolicy.min_htlc, decBase),
          public_key: response.node1_pub,
        },
        {
          base_fee_mtokens: secondPolicy.fee_base_msat,
          cltv_delta: secondPolicy.time_lock_delta,
          fee_rate: parseInt(secondPolicy.fee_rate_milli_msat, decBase),
          is_disabled: secondPolicy.disabled,
          minimum_htlc_value: parseInt(secondPolicy.min_htlc, decBase),
          public_key: response.node2_pub,
        },
      ],
      transaction_id: transactionId,
      transaction_vout: vout,
      update_at: new Date(response.last_update * msPerSec).toISOString(),
    });
  });
};

