const asyncRetry = require('async/retry');

const {getPendingChannels} = require('./../../');

const interval = retryCount => 10 * Math.pow(2, retryCount);
const times = 20;

/** Wait for a pending channel to appear

  {
    id: <Channel Transaction Id Hex String>
    [is_closing]: <Is Closing Bool>
    [is_recovering]: <Is Recovering Funds Bool>
    lnd: <Authenticated LND gRPC API Object>
  }
*/
module.exports = (args, cbk) => {
  if (!args.id) {
    return cbk([400, 'ExpectedTransactionIdToWaitForChannelPending']);
  }

  if (!args.lnd || !args.lnd.default) {
    return cbk([400, 'ExpectedAuthenticatedLndToWaitForChannelPending']);
  }

  const {id} = args;

  return asyncRetry({interval, times}, cbk => {
    return getPendingChannels({lnd: args.lnd}, (err, res) => {
      if (!!err) {
        return cbk(err);
      }

      const channel = res.pending_channels.find(n => n.transaction_id === id);

      if (!channel) {
        return cbk([503, 'FailedToFindPendingChannelWithTransactionId']);
      }

      if (!!args.is_recovering && !!channel.is_closing) {
        return cbk(null, {channel});
      }

      if (!!args.is_closing && !channel.close_transaction_id) {
        return cbk([503, 'ChannelDoesNotYetHaveCloseTransactionId']);
      }

      return cbk(null, {channel});
    });
  },
  cbk);
};
