const {test} = require('@alexbosworth/tap');

const {getBackups} = require('./../../');

const tests = [
  {
    args: {},
    description: 'LND API object is required',
    error: [400, 'ExpectedLndGrpcToExportAllChannelBackups'],
  },
  {
    args: {lnd: {default: {exportAllChannelBackups: ({}, cbk) => cbk('err')}}},
    description: 'Errors are returned from all channel backups export',
    error: [503, 'UnexpectedErrorGettingAllChanBackups', {err: 'err'}],
  },
  {
    args: {lnd: {default: {exportAllChannelBackups: ({}, cbk) => cbk()}}},
    description: 'A result is expected when exporting all channel backups',
    error: [503, 'ExpectedChanBackupsResponseForBackupsRequest'],
  },
  {
    args: {
      lnd: {default: {exportAllChannelBackups: ({}, cbk) => cbk(null, {})}},
    },
    description: 'An error is returned when channel backup result is invalid',
    error: [503, 'ExpectedChannelBackupsInBackupsResponse'],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getBackups(args), error, 'Got expected error');
    } else {
      const backups = await getBackups(args);

      deepEqual(backups, expected, 'Got expected backups');
    }

    return end();
  });
});
