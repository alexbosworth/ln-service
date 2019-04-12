/** Verify a channel backup

  {
    backup: <Backup Hex String>
    lnd: <LND GRPC API Object>
    transaction_id: <Transaction Id String>
    transaction_vout: <Transaction Output Index Number>
  }

  @returns via cbk
  {
    is_valid: <Backup is Valid Bool>
  }
*/
module.exports = (args, cbk) => {
  if (!args.backup) {
    return cbk([400, 'ExpectedChannelBackupToVerify']);
  }


  if (!args.lnd || !args.lnd.verifyChanBackup) {
    return cbk([400, 'ExpectedLndToVerifyChannelBackup']);
  }

  if (!args.transaction_id) {
    return cbk([400, 'ExpectedFundingTransactionIdOfChannelBackupToVerify']);
  }

  if (args.transaction_vout === undefined) {
    return cbk([400, 'ExpectedFundingTransactionVoutOfChannelBackupToVerify']);
  }

  const transactionId = args.transaction_id;

  return args.lnd.verifyChanBackup({
    single_chan_backups: {
      chan_backups: [{
        chan_backup: Buffer.from(args.backup, 'hex'),
        chan_point: {
          funding_txid_bytes: Buffer.from(transactionId, 'hex').reverse(),
          output_index: args.transaction_vout,
        },
      }],
    },
  },
  err => {
    if (!!err) {
      return cbk(null, {is_valid: false});
    }

    return cbk(null, {is_valid: true});
  });
};
