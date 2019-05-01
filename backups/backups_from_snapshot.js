const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncMap = require('async/map');

const {returnResult} = require('./../async-util');

const {isArray} = Array;

/** Backups from snapshot API response

  {
    single_chan_backups: {
      chan_backups: [{
        chan_backup: <Static Channel Backup Buffer Object>
        chan_point: {
          funding_txid_bytes: <Transaction Hash Buffer Object>
          output_index: <Transaction Output Index Number>
        }
      }]
    }
    multi_chan_backup: {
      chan_points: [{
        funding_txid_bytes: <Transaction Hash Buffer Object>
        output_index: <Transaction Output Index Number>
      }]
      multi_chan_backup: <Backup Buffer Object>
    }
  }

  @returns via cbk
  {
    backup: <Multiple Backup Hex String>
    channels: [{
      backup: <Backup Hex String>
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.single_chan_backups) {
        return cbk([503, 'ExpectedChannelBackupsInBackupsResponse']);
      }

      if (!isArray(args.single_chan_backups.chan_backups)) {
        return cbk([503, 'ExpectedChannelBackupsInBackupsResponse']);
      }

      return cbk();
    },

    // Channels
    channels: ['validate', ({}, cbk) => {
      return asyncMap(args.single_chan_backups.chan_backups, (backup, cbk) => {
        if (!backup) {
          return cbk([503, 'ExpectedBackupChannelBackupInSnapshot']);
        }

        if (!backup.chan_point) {
          return cbk([503, 'ExpectedBackupChanPointInSnapshot']);
        }

        if (!Buffer.isBuffer(backup.chan_point.funding_txid_bytes)) {
          return cbk([503, 'ExpectedSnapshotChannelPointTransactionId']);
        }

        if (backup.chan_point.output_index === undefined) {
          return cbk([503, 'ExpectedSnapshotChannelFundingOutputIndex']);
        }

        if (!Buffer.isBuffer(backup.chan_backup)) {
          return cbk([503, 'ExpectedChannelBackupBufferFromSnapshot']);
        }

        const transactionId = backup.chan_point.funding_txid_bytes.reverse();

        return cbk(null, {
          backup: backup.chan_backup.toString('hex'),
          transaction_id: transactionId.toString('hex'),
          transaction_vout: backup.chan_point.output_index,
        });
      },
      cbk);
    }],

    // Aggregate backup
    backup: ['channels', ({channels}, cbk) => {
      if (!args.multi_chan_backup) {
        return cbk([503, 'ExpectedMultiChannelBackupInSnapshot']);
      }

      const backup = args.multi_chan_backup.multi_chan_backup;

      return cbk(null, backup.toString('hex'));
    }],

    // Check aggregate
    checkAggregate: ['channels', ({channels}, cbk) => {
      if (!isArray(args.multi_chan_backup.chan_points)) {
        return cbk([503, 'ExpectedChannelPointsInBackupSnapshot']);
      }

      return asyncEach(args.multi_chan_backup.chan_points, (outpoint, cbk) => {
        if (!outpoint) {
          return cbk([503, 'ExpectedOutpointInSnapshotMultiBackup']);
        }

        if (!Buffer.isBuffer(outpoint.funding_txid_bytes)) {
          return cbk([503, 'ExpectedOutpointTxIdInSnapshotMultiBackup']);
        }

        if (outpoint.output_index === undefined) {
          return cbk([503, 'ExpectedOutpointVoutInSnapshotMultiBackup']);
        }

        return cbk();
      },
      cbk);
    }],

    // Overall backups
    backups: ['backup', 'channels', ({backup, channels}, cbk) => {
      return cbk(null, {backup, channels});
    }],
  },
  returnResult({of: 'backups'}, cbk));
};
