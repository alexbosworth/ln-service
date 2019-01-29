const asyncAuto = require('async/auto');

const {returnResult} = require('./../async-util');

const unimplementedError = '12 UNIMPLEMENTED: unknown service signrpc.Signer';

/** Sign transaction

  {
    inputs: [{
      key_family: <Key Family Number>
      key_index: <Key Index Number>
      output_script: <Output Script Hex String>
      output_tokens: <Output Tokens Number>
      sighash: <Sighash Type Number>
      vin: <Input Index To Sign Number>
      witness_script: <Witness Script Hex String>
    }]
    lnd: <LND Signer GRPC Object>
    transaction: <Unsigned Transaction Hex String>
  }

  @returns via cbk
  {
    signatures: [<Signature Hex String>]
  }
*/
module.exports = ({inputs, lnd, transaction}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!Array.isArray(inputs) || !inputs.length) {
        return cbk([400, 'ExpectedInputsToSignTransaction']);
      }

      if (!lnd) {
        return cbk([400, 'ExpectedLndToSignTransaction']);
      }

      if (!transaction) {
        return cbk([400, 'ExpectedUnsignedTransactionToSign']);
      }

      return cbk();
    },

    // Get signatures
    signTransaction: ['validate', ({}, cbk) => {
      return lnd.signOutputRaw({
        raw_tx_bytes: Buffer.from(transaction, 'hex'),
        sign_descs: inputs.map(input => ({
          input_index: input.vin,
          key_desc: {
            key_loc: {
              key_family: input.key_family,
              key_index: input.key_index,
            },
          },
          output: {
            pk_script: Buffer.from(input.output_script, 'hex'),
            value: input.output_tokens,
          },
          sighash: input.sighash,
          witness_script: Buffer.from(input.witness_script, 'hex'),
        })),
      },
      (err, res) => {
        if (!!err && err.message === unimplementedError) {
          return cbk([400, 'ExpectedSignerLnd']);
        }

        if (!!err) {
          return cbk([503, 'UnexpectedErrorWhenSigning', err]);
        }

        if (!res) {
          return cbk([503, 'UnexpectedEmptyResponseWhenSigning', err]);
        }

        if (!Array.isArray(res.raw_sigs) || !res.raw_sigs.length) {
          return cbk([503, 'ExpectedSignaturesInSignatureResponse', err]);
        }

        if (res.raw_sigs.find(n => !Buffer.isBuffer(n))) {
          return cbk([503, 'ExpectedSignatureBuffersInSignResponse']);
        }

        return cbk(null, {
          signatures: res.raw_sigs.map(n => n.toString('hex'))
        });
      });
    }],
  },
  returnResult({of: 'signTransaction'}, cbk));
};
