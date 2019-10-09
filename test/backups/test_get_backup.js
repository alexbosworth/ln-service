const {test} = require('tap');

const {getBackup} = require('./../../');

const txId = Buffer.alloc(32).toString('hex');

const tests = [
  {
    args: {},
    description: 'LND object is required',
    error: [400, 'ExpectedGrpcApiConnectionToGetChannelBackup'],
  },
  {
    args: {lnd: {}},
    description: 'LND object with default methods is required',
    error: [400, 'ExpectedGrpcApiConnectionToGetChannelBackup'],
  },
  {
    args: {lnd: {default: {}}},
    description: 'A funding transaction id is required',
    error: [400, 'ExpectedTxIdOfChannelToGetChannelBackup'],
  },
  {
    args: {lnd: {default: {}}, transaction_id: txId},
    description: 'A funding transaction vout is required',
    error: [400, 'ExpectedTxOutputIndexToGetChannelBackup'],
  },
  {
    args: {
      lnd: {default: {exportChannelBackup: ({}, cbk) => cbk('err')}},
      transaction_id: txId,
      transaction_vout: 0,
    },
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrExportingBackupForChannel', {err: 'err'}],
  },
  {
    args: {
      lnd: {default: {exportChannelBackup: ({}, cbk) => cbk()}},
      transaction_id: txId,
      transaction_vout: 0,
    },
    description: 'A result is returned',
    error: [503, 'ExpectedResultOfGetChannelBackupRequest'],
  },
  {
    args: {
      lnd: {default: {exportChannelBackup: ({}, cbk) => cbk(null, {})}},
      transaction_id: txId,
      transaction_vout: 0,
    },
    description: 'A chan backup result is returned',
    error: [503, 'UnexpectedResponseForChannelBackupRequest'],
  },
  {
    args: {
      lnd: {
        default: {
          exportChannelBackup: ({}, cbk) => cbk(null, {
            chan_backup: Buffer.alloc(0),
          }),
        },
      },
      transaction_id: txId,
      transaction_vout: 0,
    },
    description: 'A non empty chan backup result is returned',
    error: [503, 'UnexpectedResponseForChannelBackupRequest'],
  },
  {
    args: {
      lnd: {
        default: {
          exportChannelBackup: ({}, cbk) => cbk(null, {
            chan_backup: Buffer.alloc(1),
          }),
        },
      },
      transaction_id: txId,
      transaction_vout: 0,
    },
    description: 'A non empty chan backup result is returned',
    expected: {backup: '00'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getBackup(args), error, 'Got expected error');
    } else {
      const {backup} = await getBackup(args);

      equal(backup, expected.backup, 'Got expected backup');
    }

    return end();
  });
});
