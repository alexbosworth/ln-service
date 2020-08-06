const {test} = require('tap');

const {backupsFromSnapshot} = require('./../../backups');

const multiChanBackup = {
  chan_points: [{funding_txid_bytes: Buffer.alloc(32), output_index: 2}],
  multi_chan_backup: Buffer.from('03', 'hex'),
};

const singleChanBackups = {
  chan_backups: [{
    chan_backup: Buffer.from('00', 'hex'),
    chan_point: {funding_txid_bytes: Buffer.alloc(32), output_index: 2},
  }],
};

const tests = [
  {
    args: {
      multi_chan_backup: multiChanBackup,
      single_chan_backups: singleChanBackups,
    },
    description: 'Backups snapshot converts to backups',
    expected: {
      backup: '03',
      channel_backup: '00',
      transaction_id: Buffer.alloc(32).toString('hex'),
      transaction_vout: 2,
    },
  },
  {
    args: {multi_chan_backup: multiChanBackup},
    description: 'Backups missing single channel backups',
    expected: {err: [503, 'ExpectedChannelBackupsInBackupsResponse']},
  },
  {
    args: {multi_chan_backup: multiChanBackup, single_chan_backups: {}},
    description: 'Backups missing single channel backups array',
    expected: {err: [503, 'ExpectedChannelBackupsInBackupsResponse']},
  },
  {
    args: {single_chan_backups: singleChanBackups},
    description: 'Backups missing multiple channel backups',
    expected: {err: [503, 'ExpectedMultiChannelBackupInSnapshot']},
  },
  {
    args: {
      single_chan_backups: singleChanBackups,
      multi_chan_backup: {
        chan_points: [{}],
        multi_chan_backup: Buffer.from('03', 'hex'),
      },
    },
    description: 'Multi backups must contain a tx id in chan points',
    expected: {err: [503, 'ExpectedOutpointTxIdInSnapshotMultiBackup']},
  },
  {
    args: {
      single_chan_backups: singleChanBackups,
      multi_chan_backup: {
        chan_points: [{funding_txid_bytes: Buffer.from('01', 'hex')}],
        multi_chan_backup: Buffer.from('03', 'hex'),
      },
    },
    description: 'Multi backups must contain a vout in chan points',
    expected: {err: [503, 'ExpectedOutpointVoutInSnapshotMultiBackup']},
  },
  {
    args: {
      single_chan_backups: singleChanBackups,
      multi_chan_backup: {
        chan_points: [null],
        multi_chan_backup: Buffer.from('03', 'hex'),
      },
    },
    description: 'Multi chan backup chan points must be objects',
    expected: {err: [503, 'ExpectedOutpointInSnapshotMultiBackup']},
  },
  {
    args: {
      single_chan_backups: singleChanBackups,
      multi_chan_backup: {multi_chan_backup: Buffer.from('03', 'hex')},
    },
    description: 'Multi chan backups must have array of channel points',
    expected: {err: [503, 'ExpectedChannelPointsInBackupSnapshot']},
  },
  {
    args: {single_chan_backups: {chan_backups: [{chan_backup: '00'}]}},
    description: 'Single chan backups must be buffers',
    expected: {err: [503, 'ExpectedChannelBackupBufferFromSnapshot']},
  },
  {
    args: {
      single_chan_backups: {
        chan_backups: [{
          chan_backup: Buffer.from('00', 'hex'),
          chan_point: {funding_txid_bytes: Buffer.from('01', 'hex')},
        }],
      },
    },
    description: 'Single chan backup chan points must have vouts',
    expected: {err: [503, 'ExpectedSnapshotChannelFundingOutputIndex']},
  },
  {
    args: {
      single_chan_backups: {
        chan_backups: [{
          chan_backup: Buffer.from('00', 'hex'),
          chan_point: {},
        }],
      },
    },
    description: 'Single chan backup chan points must have tx ids',
    expected: {err: [503, 'ExpectedSnapshotChannelPointTransactionId']},
  },
  {
    args: {
      single_chan_backups: {
        chan_backups: [{chan_backup: Buffer.from('00', 'hex')}],
      },
    },
    description: 'Single chan backup must have a channel funding outpoint',
    expected: {err: [503, 'ExpectedBackupChanPointInSnapshot']},
  },
  {
    args: {single_chan_backups: {chan_backups: [null]}},
    description: 'Single chan backups must not be null',
    expected: {err: [503, 'ExpectedBackupChannelBackupInSnapshot']},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    return backupsFromSnapshot(args, (err, res) => {
      const [errCode, errMessage] = err || [];

      if (!!expected.err) {
        const [expectedCode, expectedMessage] = expected.err;

        equal(errCode, expectedCode, 'Error code as expected');
        equal(errMessage, expectedMessage, 'Error message as expected');

        return end();
      }

      const {backup, channels} = res;

      const [channel] = channels;

      equal(backup, expected.backup, 'Backup as expected');
      equal(channel.backup, expected.channel_backup, 'Chan backup returned');
      equal(channel.transaction_id, expected.transaction_id, 'Chan tx id');
      equal(channel.transaction_vout, expected.transaction_vout, 'Chan vout');

      return end();
    });
  });
});
