/** Verify and restore channels from a multi-channel backup

  {
    backup: <Backup Hex String>
    lnd: <LND GRPC API Object>
  }
*/
module.exports = ({backup, lnd}, cbk) => {
  if (!backup) {
    return cbk([400, 'ExpectedBackupWhenAttemptingToRestoreChannelFunds']);
  }

  if (!lnd || !lnd.restoreChannelBackups) {
    return cbk([400, 'ExpectedLndWhenAttemptingToRestoreChannelFunds']);
  }

  return lnd.restoreChannelBackups({
    multi_chan_backup: Buffer.from(backup, 'hex'),
  },
  err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorWhenAttemptingChannelFundsRestore']);
    }

    return cbk();
  });
};
