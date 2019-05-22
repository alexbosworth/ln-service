const asyncRetry = require('async/retry');

const {getChannels} = require('./../../');

const interval = retryCount => 10 * Math.pow(2, retryCount);
const times = 20;

/** Wait for channel to be open

  {
    id: <Channel Transaction Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
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

      return cbk();
    });
  },
  cbk);
};
