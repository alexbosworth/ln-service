const {test} = require('tap');

const {diffieHellmanComputeSecret} = require('./../../');

const makeLnd = (err, res) => {
  return {signer: {deriveSharedKey: ({}, cbk) => cbk(err, res)}};
};

const makeArgs = ({override}) => {
  const args = {
    lnd: makeLnd(null, {shared_key: Buffer.alloc(32)}),
    partner_public_key: '00',
  };

  Object.keys(override || {}).forEach(key => args[key] = override[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({override: {lnd: undefined}}),
    description: 'LND is required',
    error: [400, 'ExpectedAuthenticatedLndToComputeSharedSecret'],
  },
  {
    args: makeArgs({override: {partner_public_key: undefined}}),
    description: 'A public key is required',
    error: [400, 'ExpectedHexEncodedPartnerPublicKey'],
  },
  {
    args: makeArgs({}),
    description: 'Secret is calculated',
    expected: {
      secret: '0000000000000000000000000000000000000000000000000000000000000000',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      await rejects(diffieHellmanComputeSecret(args), error, 'Got error');
    } else {
      const {secret} = await diffieHellmanComputeSecret(args);

      equal(secret.toString('hex'), expected.secret, 'Got expected secret');
    }

    return end();
  });
});
