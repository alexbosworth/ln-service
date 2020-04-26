const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const verifyBackup = require('./verify_backup');

const existsErr = 'unable to unpack single backups: channel already exists';

/** Verify and restore a channel from a single channel backup

  Requires `offchain:write` permission

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
*/
module.exports = ({backup, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!backup) {
          return cbk([400, 'ExpectedBackupWhenAttemptingChannelRestoration']);
        }

        if (!lnd || !lnd.default) {
          return cbk([400, 'ExpectedLndToRestoreChannelFromBackup']);
        }

        return cbk();
      },

      // Check the backup
      checkBackup: ['validate', ({}, cbk) => verifyBackup({backup, lnd}, cbk)],

      // Attempt restore
      restoreChannel: ['checkBackup', ({checkBackup}, cbk) => {
        if (!checkBackup.is_valid) {
          return cbk([400, 'ProvidedBackupIsInvalid']);
        }

        return lnd.default.restoreChannelBackups({
          chan_backups: {
            chan_backups: [{chan_backup: Buffer.from(backup, 'hex')}],
          },
        },
        err => {
          if (!!err && err.details === existsErr) {
            return cbk([400, 'ChannelAlreadyExists']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorRestoringChanFromBackup', {err}]);
          }

          return cbk(null, {});
        });
      }],
    },
    returnResult({reject, resolve, of: 'restoreChannel'}, cbk));
  });
};
