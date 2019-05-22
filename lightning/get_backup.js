const isHex = require('is-hex');

/** Get the static channel backup for a channel

  {
    lnd: <Authenticated LND gRPC API Object>
    transaction_id: <Funding Transaction Id Hex String>
    transaction_vout: <Funding Transaction Output Index Number>
  }

  @returns via cbk
  {
    backup: <Channel Backup Hex String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.default) {
    return cbk([400, 'ExpectedGrpcApiConnectionToGetChannelBackup']);
  }

  if (!args.transaction_id || !isHex(args.transaction_id)) {
    return cbk([400, 'ExpectedTransactionIdOfChannelToGetChannelBackup']);
  }

  if (args.transaction_vout === undefined) {
    return cbk([400, 'ExpectedTransactionOutputIndexToGetChannelBackup']);
  }

  return args.lnd.default.exportChannelBackup({
    chan_point: {
      funding_txid_bytes: Buffer.from(args.transaction_id, 'hex').reverse(),
      output_index: args.transaction_vout,
    },
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorExportingBackupForChannel', {err}]);
    }

    if (!res || !Buffer.isBuffer(res.chan_backup) || !res.chan_backup.length) {
      return cbk([503, 'UnexpectedResponseForChannelBackupRequest']);
    }

    return cbk(null, {backup: res.chan_backup.toString('hex')});
  });
};
