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
    expected: {},
  },
  {
    args: {lnd: makeLnd('err')},
    description: 'Unexpected errors are passed back',
    error: [503, 'UnexpectedErrorGettingTowerServerInfo', {err: 'err'}],
  },
  {
    args: {lnd: makeLnd()},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseForTowerServerRequest'],
  },
  {
    args: {lnd: makeLnd(null, {})},
    description: 'An array of listeners is expected',
    error: [503, 'ExpectedArrayOfListenersForTowerServer'],
  },
  {
    args: {lnd: makeLnd(null, {listeners: [1]})},
    description: 'An array of listeners is expected',
    error: [503, 'ExpectedArrayOfListenerStrings'],
  },
  {
    args: {lnd: makeLnd(null, {listeners: ['listener']})},
    description: 'A server public key is expected',
    error: [503, 'ExpectedPublicKeyForTowerServer'],
  },
  {
    args: {
      lnd: makeLnd(null, {listeners: ['listener'], pubkey: Buffer.alloc(1)}),
    },
    description: 'A server public key of normal length is expected',
    error: [503, 'ExpectedPublicKeyForTowerServer'],
  },
  {
    args: {
      lnd: makeLnd(null, {listeners: ['listener'], pubkey: Buffer.alloc(33)}),
    },
    description: 'Server URIs are expected',
    error: [503, 'ExpectedArrayOfUrisForTowerServer'],
  },
  {
    args: {
      lnd: makeLnd(null, {
        listeners: ['listener'],
        pubkey: Buffer.alloc(33),
        uris: [1],
      }),
    },
    description: 'Server URIs are expected',
    error: [503, 'ExpectedArrayOfUriStrings'],
  },
  {
    args: {
      lnd: makeLnd(null, {
        listeners: ['listener'],
        pubkey: Buffer.alloc(33),
        uris: ['uri'],
      }),
    },
    description: 'Server info returned',
    expected: {
      tower: {
        public_key: '000000000000000000000000000000000000000000000000000000000000000000',
        sockets: ['listener'],
        uris: ['uri'],
      },
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getTowerServerInfo(args), error, 'Got expected error');
    } else {
      deepEqual(await getTowerServerInfo(args), expected, 'Got server info');
    }

    return end();
  });
});
