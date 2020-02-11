const {test} = require('tap');

const {connectWatchtower} = require('./../../');

const makeLnd = err => {
  return {tower_client: {addTower: ({}, cbk) => cbk(err)}};
};

const makeArgs = override => {
  const args = {lnd: makeLnd(), public_key: '00', socket: 'socket'};

  Object.keys(override).map(attr => args[attr] = override[attr]);

  return args;
};

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToConnectToWatchtower'],
  },
  {
    args: makeArgs({public_key: undefined}),
    description: 'Tower public key is required',
    error: [400, 'ExpectedPublicKeyOfWatchtowerToConnectTo'],
  },
  {
    args: makeArgs({socket: undefined}),
    description: 'Tower socket is required',
    error: [400, 'ExpectedSocketOfWatchtowerToConnectTo'],
  },
  {
    args: makeArgs({
      lnd: makeLnd({
        message: '12 UNIMPLEMENTED: unknown service wtclientrpc.WatchtowerClient',
      }),
    }),
    description: 'Unimplemented tower returns an error',
    error: [503, 'ExpectedLndCompiledWithWtclientrpcBuildTag'],
  },
  {
    args: makeArgs({lnd: makeLnd('err')}),
    description: 'Unimplemented tower returns an error',
    error: [503, 'UnexpectedErrorConnectingWatchtower', {err: 'err'}],
  },
  {
    args: makeArgs({}),
    description: 'Watchtower is connected',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      await rejects(() => connectWatchtower(args), error, 'Got error');
    } else {
      await connectWatchtower(args);
    }

    return end();
  });
});
