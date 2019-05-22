const asyncAuto = require('async/auto');

const {returnResult} = require('./../async-util');
const verifyBackup = require('./verify_backup');

const existsErr = 'unable to unpack single backups: channel already exists';

/** Verify and restore a channel from a single channel backup

  {
    backup: <Backup Hex String>
    lnd: <Authenticated LND gRPC API Object>
    transaction_id: <Channel Funding Transaction Id Hex String>
    transaction_vout: <Channel Funding Transaction Output Index Hex String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.backup) {
        return cbk([400, 'ExpectedBackupWhenAttemptingChannelRestoration']);
      }

      if (!args.lnd || !args.lnd.default) {
        return cbk([400, 'ExpectedLndToRestoreChannelFromBackup']);
      }

      if (!args.transaction_id) {
        return cbk([400, 'ExpectedTransactionIdOfChannelToRestore']);
      }

      if (args.transaction_vout === undefined) {
        return cbk([400, 'ExpectedTransactionVoutOfChannelToRestore']);
      }

      return cbk();
    },

    // Check the backup
    checkBackup: ['validate', ({}, cbk) => {
      return verifyBackup({
        backup: args.backup,
        lnd: args.lnd,
        transaction_id: args.transaction_id,
        transaction_vout: args.transaction_vout,
      },
      cbk);
    }],

    // Attempt restore
    restoreChannel: ['checkBackup', ({checkBackup}, cbk) => {
      if (!checkBackup.is_valid) {
        return cbk([400, 'ProvidedBackupIsInvalid']);
      }

      const transactionId = Buffer.from(args.transaction_id, 'hex');

      return args.lnd.default.restoreChannelBackups({
        chan_backups: {
          chan_backups: [{
            chan_backup: Buffer.from(args.backup, 'hex'),
            chan_point: [{
              funding_txid_bytes: transactionId.reverse(),
              output_index: args.transaction_vout,
            }],
          }],
        },
      },
      err => {
        if (!!err && err.details === existsErr) {
          return cbk([400, 'ChannelAlreadyExists']);
        }

        if (!!err) {
          return cbk([503, 'UnexpectedErrWhenRestoringChanFromBackup', {err}]);
        }

        return cbk();
      });
    }],
  },
  returnResult({}, cbk));
};
