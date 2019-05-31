const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {backupsFromSnapshot} = require('./../backups');

/** Get all channel backups

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
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
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd || !lnd.default || !lnd.default.exportAllChannelBackups) {
        return cbk([400, 'ExpectedLndGrpcToExportAllChannelBackups']);
      }

      return cbk();
    },

    // Get backups snapshot
    getBackupsSnapshot: ['validate', ({}, cbk) => {
      return lnd.default.exportAllChannelBackups({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'UnexpectedErrorGettingAllChannelBackups', {err}]);
        }

        if (!res) {
          return cbk([503, 'ExpectedChannelBackupsResponseForBackupsRequest']);
        }

        return cbk(null, res);
      });
    }],

    // Backups format of snapshot
    backups: ['getBackupsSnapshot', ({getBackupsSnapshot}, cbk) => {
      return backupsFromSnapshot(getBackupsSnapshot, cbk);
    }],
  },
  returnResult({of: 'backups'}, cbk));
};
