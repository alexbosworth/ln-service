const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {backupsFromSnapshot} = require('./../backups');
const {isLnd} = require('./../grpc');

const method = 'exportAllChannelBackups';

/** Get all channel backups

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    backup: <All Channels Backup Hex String>
    channels: {
      backup: <Individualized Channel Backup Hex String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Channel Funding Transaction Output Index Number>
    }
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd, method, type: 'default'})) {
          return cbk([400, 'ExpectedLndGrpcToExportAllChannelBackups']);
        }

        return cbk();
      },

      // Get backups snapshot
      getBackupsSnapshot: ['validate', ({}, cbk) => {
        return lnd.default.exportAllChannelBackups({}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingAllChanBackups', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedChanBackupsResponseForBackupsRequest']);
          }

          return cbk(null, res);
        });
      }],

      // Backups format of snapshot
      backups: ['getBackupsSnapshot', ({getBackupsSnapshot}, cbk) => {
        return backupsFromSnapshot(getBackupsSnapshot, cbk);
      }],
    },
    returnResult({reject, resolve, of: 'backups'}, cbk));
  });
};
