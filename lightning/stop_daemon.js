const asyncRetry = require('async/retry');

const getWalletInfo = require('./get_wallet_info');

const connectionFailureMessage = 'FailedToConnectToDaemon';
const interval = retryCount => 50 * Math.pow(2, retryCount);
const times = 5;

/** Stop the Lightning daemon.

  {
    lnd: <LND GRPC API Object>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.stopDaemon) {
    return cbk([400, 'ExpectedLndToStopDaemon']);
  }

  return lnd.stopDaemon({}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorStoppingLightningDaemon', err]);
    }

    return asyncRetry({interval, times}, cbk => {
      return getWalletInfo({lnd}, err => {
        if (!Array.isArray(err)) {
          return cbk([503, 'FailedToStopDaemon']);
        }

        const [, message] = err;

        if (message !== 'FailedToConnectToDaemon') {
          return cbk([503, 'ExpectedDaemonShutdown']);
        }

        return cbk();
      });
    },
    cbk);
  });
};

