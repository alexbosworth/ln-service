const {test} = require('tap');

const {verifyBytesSignature} = require('./../../');

const makeLnd = (err, res) => {
  return {signer: {verifyMessage: ({}, cbk) => cbk(err, res)}};
};

const makeArgs = ({override}) => {
  const args = {
    lnd: makeLnd(null, {valid: true}),
    preimage: Buffer.alloc(32).toString('hex'),
    public_key: Buffer.alloc(33).toString('hex'),
    signature: '00',
  };

  Object.keys(override || {}).forEach(key => args[key] = override[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({override: {lnd: undefined}}),
    description: 'LND is required to verify bytes signature',
    error: [400, 'ExpectedLndToVerifyBytesSignature'],
  },
  {
    args: makeArgs({override: {preimage: undefined}}),
    description: 'A preimage is required to verify bytes signature',
    error: [400, 'ExpectedPreimageToVerifyBytesSignature'],
  },
  {
    args: makeArgs({override: {public_key: undefined}}),
    description: 'A public key is required to verify bytes signature',
    error: [400, 'ExpectedPublicKeyToVerifyBytesSignature'],
  },
  {
    args: makeArgs({override: {signature: undefined}}),
    description: 'A signature is required to verify bytes signature',
    error: [400, 'ExpectedSignatureToVerifyBytesSignature'],
  },
  {
    args: makeArgs({
      override: {
        lnd: makeLnd({
          message: '12 UNIMPLEMENTED: unknown service signrpc.Signer',
        }),
      },
    }),
    description: 'Unsupported method returns error',
    error: [400, 'ExpectedSignerRpcLndBuildTagToVerifySignBytes'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd('err')}}),
    description: 'Unexpected error returns error',
    error: [503, 'UnexpectedErrWhenVerifyingSignedBytes', {err: 'err'}],
  },
  {
    args: makeArgs({override: {lnd: makeLnd()}}),
    description: 'No response returns error',
    error: [503, 'UnexpectedEmptyResponseWhenVerifyingBytesSig'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, {})}}),
    description: 'No valid attribute returns error',
    error: [503, 'ExpectedValidStateOfSignatureOverBytes'],
  },
  {
    args: makeArgs({}),
    description: 'No valid attribute returns error',
    expected: {is_valid: true},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      await rejects(verifyBytesSignature(args), error, 'Got expected error');
    } else {
      const validity = await verifyBytesSignature(args);

      equal(validity.is_valid, expected.is_valid, 'Got expected validity');
    }

    return end();
  });
});
