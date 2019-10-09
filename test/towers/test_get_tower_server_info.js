const {test} = require('tap');

const {getTowerServerInfo} = require('./../../');

const makeLnd = (err, res) => {
  return {tower_server: {getInfo: ({}, cbk) => cbk(err, res)}};
};

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedAuthedLndGrpcToGetWatchtowerServerInfo'],
  },
  {
    args: {lnd: makeLnd({message: '2 UNKNOWN: watchtower not active'})},
    description: 'Inactive tower returns no details',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getTowerServerInfo(args), error, 'Got expected error');
    } else {
      await getTowerServerInfo(args);
    }

    return end();
  });
});
