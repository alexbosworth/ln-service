const {isFinite} = require('lodash');

const decBase = 10;
const edgeNotFoundErrorMessage = 'edge not found';
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
      [base_fee_mtokens]: <Base Fee Millitokens String>
      [cltv_delta]: <Locktime Delta Number>
      [fee_rate]: <Fees Charged Per Million Tokens Number>
      [is_disabled]: <Channel Is Disabled Bool>
      [minimum_htlc_mtokens]: <Minimum HTLC Millitokens Value Number>
      public_key: <Node Public Key String>
    }]
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
    [update_at]: <Channel Last Updated At ISO 8601 Date String>
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
    if (!!err && err.details === edgeNotFoundErrorMessage) {
      return cbk([404, 'FullChannelDetailsNotFound']);
    }

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

    if (response.last_update === undefined) {
      return cbk([503, 'ExpectedChannelLastUpdate']);
    }

    if (!!response.node1_policy) {
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
    }

    if (!response.node1_pub) {
      return cbk([503, 'ExpectedChannelNodePublicKey']);
    }

    if (!!response.node2_policy) {
      if (!response.node2_policy) {
        return cbk([503, 'ExpectedNode2PolicyInChannelResponse']);
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
    }

    if (!response.node2_pub) {
      return cbk([503, 'ExpectedChannelNodePublicKey']);
    }

    const [transactionId, vout] = response.chan_point.split(separatorChar);
    const updatedAt = response.last_update * msPerSec;

    if (!transactionId) {
      return cbk([503, 'ExpectedTransactionId']);
    }

    if (!isFinite(parseInt(vout, decBase))) {
      return cbk([503, 'ExpectedVout']);
    }

    const policies = [response.node1_policy, response.node2_policy].map(n => {
      if (!n) {
        return {};
      }

      return {
        base_fee_mtokens: n.fee_base_msat,
        cltv_delta: n.time_lock_delta,
        fee_rate: parseInt(n.fee_rate_milli_msat, decBase),
        is_disabled: n.disabled,
        minimum_htlc_mtokens: parseInt(n.min_htlc, decBase),
      };
    });

    const [node1Policy, node2Policy] = policies;

    node1Policy.public_key = response.node1_pub;
    node2Policy.public_key = response.node2_pub;

    const firstPolicy = response.node1_policy;
    const secondPolicy = response.node2_policy;

    return cbk(null, {
      policies,
      capacity: parseInt(response.capacity, decBase),
      transaction_id: transactionId,
      transaction_vout: parseInt(vout, decBase),
      update_at: !updatedAt ? undefined : new Date(updatedAt).toISOString(),
    });
  });
};

