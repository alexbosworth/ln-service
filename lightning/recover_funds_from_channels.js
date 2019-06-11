const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

/** Verify and restore channels from a multi-channel backup

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
*/
module.exports = ({backup, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!backup || !isHex(backup)) {
          return cbk([400, 'ExpectedBackupWhenAttemptingRestoreChannelFunds']);
        }

        if (!lnd || !lnd.default || !lnd.default.restoreChannelBackups) {
          return cbk([400, 'ExpectedLndWhenAttemptingToRestoreChannelFunds']);
        }

        return cbk();
      },

      // Restore backups
      restore: ['validate', ({}, cbk) => {
        return lnd.default.restoreChannelBackups({
          multi_chan_backup: Buffer.from(backup, 'hex'),
        },
        err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrWhenRestoringChannelFunds', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
