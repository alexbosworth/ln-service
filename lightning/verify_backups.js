const isHex = require('is-hex');

const {isArray} = Array;

/** Verify a set of aggregated channel backups

  {
    backup: <Multi-Backup Hex String>
    channels: [{
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
    }]
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    is_valid: <Backup is Valid Bool>
  }
*/
module.exports = ({backup, channels, lnd}, cbk) => {
  if (!backup || !isHex(backup)) {
    return cbk([400, 'ExpectedMultiChannelBackupToVerify']);
  }

  if (!isArray(channels)) {
    return cbk([400, 'ExpectedChannelsToVerifyInMultiBackup']);
  }

  if (!lnd || !lnd.default || !lnd.default.verifyChanBackup) {
    return cbk([400, 'ExpectedAuthenticatedLndToVerifyChanBackup']);
  }

  const invalidChannel = channels.find(channel => {
    return !channel.transaction_id || channel.transaction_vout === undefined;
  });

  if (!!invalidChannel) {
    return cbk([400, 'ExpectedChannelOutpointsToVerifyBackups']);
  }

  return lnd.default.verifyChanBackup({
    multi_chan_backup: {
      chan_points: channels.map(chan => ({
        funding_txid_bytes: Buffer.from(chan.transaction_id, 'hex').reverse(),
        output_index: chan.transaction_vout,
      })),
      multi_chan_backup: Buffer.from(backup, 'hex'),
    },
  },
  err => {
    if (!!err) {
      return cbk(null, {is_valid: false});
    }

    return cbk(null, {is_valid: true});
  });
};
