const isHex = require('is-hex');

/** Verify and restore channels from a multi-channel backup

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }
*/
module.exports = ({backup, lnd}, cbk) => {
  if (!backup || !isHex(backup)) {
    return cbk([400, 'ExpectedBackupWhenAttemptingToRestoreChannelFunds']);
  }

  if (!lnd || !lnd.default || !lnd.default.restoreChannelBackups) {
    return cbk([400, 'ExpectedLndWhenAttemptingToRestoreChannelFunds']);
  }

  return lnd.default.restoreChannelBackups({
    multi_chan_backup: Buffer.from(backup, 'hex'),
  },
  err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrWhenRestoringChannelFunds', {err}]);
    }

    return cbk();
  });
};
