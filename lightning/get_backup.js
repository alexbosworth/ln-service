const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isHash} = require('./../chain');

/** Get the static channel backup for a channel

  {
    lnd: <Authenticated LND gRPC API Object>
    transaction_id: <Funding Transaction Id Hex String>
    transaction_vout: <Funding Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
    backup: <Channel Backup Hex String>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default) {
          return cbk([400, 'ExpectedGrpcApiConnectionToGetChannelBackup']);
        }

        if (!isHash({hash: args.transaction_id}).is_hash) {
          return cbk([400, 'ExpectedTxIdOfChannelToGetChannelBackup']);
        }

        if (args.transaction_vout === undefined) {
          return cbk([400, 'ExpectedTxOutputIndexToGetChannelBackup']);
        }

        return cbk();
      },

      // Get backup
      getBackup: ['validate', ({}, cbk) => {
        const txId = Buffer.from(args.transaction_id, 'hex').reverse();

        return args.lnd.default.exportChannelBackup({
          chan_point: {
            funding_txid_bytes: txId,
            output_index: args.transaction_vout,
          },
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrExportingBackupForChannel', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultOfGetChannelBackupRequest']);
          }

          if (!Buffer.isBuffer(res.chan_backup) || !res.chan_backup.length) {
            return cbk([503, 'UnexpectedResponseForChannelBackupRequest']);
          }

          return cbk(null, {backup: res.chan_backup.toString('hex')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getBackup'}, cbk));
  });
};
