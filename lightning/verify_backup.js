const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

/** Verify a channel backup

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    [err]: <LND Error Object>
    is_valid: <Backup is Valid Bool>
  }
*/
module.exports = ({backup, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!backup) {
          return cbk([400, 'ExpectedChannelBackupToVerify']);
        }

        if (!lnd || !lnd.default) {
          return cbk([400, 'ExpectedLndToVerifyChannelBackup']);
        }

        return cbk();
      },

      // Verify backup
      verify: ['validate', ({}, cbk) => {
        return lnd.default.verifyChanBackup({
          single_chan_backups: {
            chan_backups: [{chan_backup: Buffer.from(backup, 'hex')}],
          },
        },
        err => {
          if (!!err) {
            return cbk(null, {err, is_valid: false});
          }

          return cbk(null, {is_valid: true});
        });
      }],
    },
    returnResult({reject, resolve, of: 'verify'}, cbk));
  });
};
