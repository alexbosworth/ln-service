const {test} = require('tap');

const {backupsFromSnapshot} = require('./../../backups');

const tests = [
  {
    args: {
      single_chan_backups: {
        chan_backups: [{
          chan_backup: Buffer.from('00', 'hex'),
          chan_point: {
            funding_txid_bytes: Buffer.from('01', 'hex'),
            output_index: 2,
          },
        }],
      },
      multi_chan_backup: {
        chan_points: [{
          funding_txid_bytes: Buffer.from('01', 'hex'),
          output_index: 2,
        }],
        multi_chan_backup: Buffer.from('03', 'hex'),
      },
    },
    description: 'Backups snapshot converts to backups',
    expected: {
      backup: '03',
      channel_backup: '00',
      transaction_id: '01',
      transaction_vout: 2,
    },
  },
  {
    args: {
      multi_chan_backup: {
        chan_points: [{
          funding_txid_bytes: Buffer.from('01', 'hex'),
          output_index: 2,
        }],
        multi_chan_backup: Buffer.from('03', 'hex'),
      },
    },
    description: 'Backups missing single channel backups',
    expected: {err: [503, 'ExpectedChannelBackupsInBackupsResponse']},
  },
  {
    args: {
      single_chan_backups: {},
      multi_chan_backup: {
        chan_points: [{
          funding_txid_bytes: Buffer.from('01', 'hex'),
          output_index: 2,
        }],
        multi_chan_backup: Buffer.from('03', 'hex'),
      },
    },
    description: 'Backups missing single channel backups array',
    expected: {err: [503, 'ExpectedChannelBackupsInBackupsResponse']},
  },
  {
    args: {
      single_chan_backups: {
        chan_backups: [{
          chan_backup: Buffer.from('00', 'hex'),
          chan_point: {
            funding_txid_bytes: Buffer.from('01', 'hex'),
            output_index: 2,
          },
        }],
      },
    },
    description: 'Backups missing multiple channel backups',
    expected: {err: [503, 'ExpectedMultiChannelBackupInSnapshot']},
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
