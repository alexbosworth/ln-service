const asyncRetry = require('async/retry');

const {getChannels} = require('./../../');

const interval = retryCount => 10 * Math.pow(2, retryCount);
const times = 20;

/** Wait for channel to be open

  {
    id: <Channel Transaction Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    capacity: <Channel Token Capacity Number>
    commit_transaction_fee: <Commit Transaction Fee Number>
    commit_transaction_weight: <Commit Transaction Weight Number>
    id: <Standard Format Channel Id String>
    is_active: <Channel Active Bool>
    is_closing: <Channel Is Closing Bool>
    is_opening: <Channel Is Opening Bool>
    is_partner_initiated: <Channel Partner Opened Channel>
    is_private: <Channel Is Private Bool>
    local_balance: <Local Balance Tokens Number>
    partner_public_key: <Channel Partner Public Key String>
    pending_payments: [{
      id: <Payment Preimage Hash Hex String>
      is_outgoing: <Payment Is Outgoing Bool>
      timeout: <Chain Height Expiration Number>
      tokens: <Payment Tokens Number>
    }]
    received: <Received Tokens Number>
    remote_balance: <Remote Balance Tokens Number>
    sent: <Sent Tokens Number>
    transaction_id: <Blockchain Transaction Id String>
    transaction_vout: <Blockchain Transaction Vout Number>
    unsettled_balance: <Unsettled Balance Tokens Number>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  if (!id) {
    return cbk([400, 'ExpectedTransactionIdToWaitForChannelOpen']);
  }

  if (!lnd || !lnd.default) {
    return cbk([400, 'ExpectedAuthenticatedLndToWaitForChannelOpen']);
  }

  return asyncRetry({interval, times}, cbk => {
    return getChannels({lnd}, (err, res) => {
      if (!!err) {
        return cbk(err);
      }

      const channel = res.channels.find(n => n.transaction_id === id);

      if (!channel) {
        return cbk([503, 'FailedToFindChannelWithTransactionId']);
      }

      return cbk(null, channel);
    });
  },
  cbk);
};
