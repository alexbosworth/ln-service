const asyncRetry = require('async/retry');

const {getWalletInfo} = require('./../../');

const interval = 100;
const times = 100;

/** Wait for lnd to be terminated

  {
    lnd: <Authenticated LND gRPC API Object>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.default) {
    return cbk([400, 'ExpectedAuthenticatedLndToWaitForTermination']);
  }

  return asyncRetry({interval, times}, cbk => {
    return getWalletInfo({lnd}, err => {
      if (!err) {
        return cbk([503, 'ExpectedLndTerminated']);
      }

      return cbk();
    });
  },
  cbk);
};
