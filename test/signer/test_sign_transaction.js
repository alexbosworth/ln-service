const {test} = require('tap');

const {signTransaction} = require('./../../');

const makeLnd = (err, res) => {
  return {signer: {signOutputRaw: ({}, cbk) => cbk(err, res)}};
};

const makeArgs = ({override}) => {
  const args = {
    inputs: [{
      key_family: 0,
      key_index: 0,
      output_script: '00',
      output_tokens: 1,
      sighash: 1,
      vin: 0,
      witness_script: '00',
    }],
    lnd: makeLnd(null, {raw_sigs: [Buffer.alloc(1)]}),
    transaction: '00',
  };

  Object.keys(override || {}).forEach(key => args[key] = override[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({override: {inputs: undefined}}),
    description: 'Inputs are required',
    error: [400, 'ExpectedInputsToSignTransaction'],
  },
  {
    args: makeArgs({override: {inputs: []}}),
    description: 'Inputs are required',
    error: [400, 'ExpectedInputsToSignTransaction'],
  },
  {
    args: makeArgs({override: {lnd: undefined}}),
    description: 'LND is required',
    error: [400, 'ExpectedAuthenticatedLndToSignTransaction'],
  },
  {
    args: makeArgs({override: {transaction: undefined}}),
    description: 'A transaction to sign is required',
    error: [400, 'ExpectedUnsignedTransactionToSign'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd({message: '12 UNIMPLEMENTED: unknown service signrpc.Signer'})}}),
    description: 'Unsupported error is returned',
    error: [400, 'ExpectedLndBuiltWithSignerRpcBuildTag'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd('err')}}),
    description: 'Unexpected error is returned',
    error: [503, 'UnexpectedErrorWhenSigning', {err: 'err'}],
  },
  {
    args: makeArgs({override: {lnd: makeLnd()}}),
    description: 'A non empty response is expected',
    error: [503, 'UnexpectedEmptyResponseWhenSigning'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, {})}}),
    description: 'A raw sigs array is expected',
    error: [503, 'ExpectedSignaturesInSignatureResponse'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, {raw_sigs: []})}}),
    description: 'A non-empty raw sigs array is expected',
    error: [503, 'ExpectedSignaturesInSignatureResponse'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, {raw_sigs: ['']})}}),
    description: 'Buffers in raw sigs array are expected',
    error: [503, 'ExpectedSignatureBuffersInSignResponse'],
  },
  {
    args: makeArgs({override: {
      lnd: makeLnd(null, {raw_sigs: [Buffer.alloc(1)]})}
    }),
    description: 'Buffers in raw sigs array are expected',
    expected: {signature: '00'},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({end, equal, rejects}) => {
    if (!!error) {
      await rejects(signTransaction(args), error, 'Got expected error');
    } else {
      const {signatures} = await signTransaction(args);

      const [signature] = signatures;

      equal(signature, expected.signature, 'Got expected signature');
    }

    return end();
  });
});
