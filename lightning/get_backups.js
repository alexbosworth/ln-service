const {backupsFromSnapshot} = require('./../backups');

const {isArray} = Array;

/** Get all channel backups

  {
    lnd: <GRPC API Object>
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
  if (!lnd || !lnd.exportAllChannelBackups) {
    return cbk([400, 'Expected'])
  }

  return lnd.exportAllChannelBackups({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingChannelBackups', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedChannelBackupsResponse']);
    }

    return backupsFromSnapshot(res, (err, res) => {
      if (!!err) {
        return cbk(err);
      }

      return cbk(null, res);
    });
  });
};
