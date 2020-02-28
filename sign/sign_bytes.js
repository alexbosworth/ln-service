const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');
const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);

const unimplementedError = '12 UNIMPLEMENTED: unknown service signrpc.Signer';

/** Sign a sha256 hash of arbitrary bytes

  Requires LND built with `signerrpc` build tag

  This method is not supported in LND v0.8.2 and below

  {
    key_family: <Key Family Number>
    key_index: <Key Index Number>
    lnd: <Authenticated LND gRPC API Object>
    preimage: <Bytes To Hash and Sign Hex Encoded String>
  }

  @returns via cbk or Promise
  {
    signature: <Signature Hex String>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (args.key_family === undefined) {
          return cbk([400, 'ExpectedKeyFamilyToSignBytes']);
        }

        if (args.key_index === undefined) {
          return cbk([400, 'ExpectedKeyIndexToSignBytes']);
        }

        if (!isLnd({lnd: args.lnd, method: 'signMessage', type: 'signer'})) {
          return cbk([400, 'ExpectedLndToSignBytes']);
        }

        if (!args.preimage || !args.preimage.length || !isHex(args.preimage)) {
          return cbk([400, 'ExpectedHexDataToSignBytes']);
        }

        return cbk();
      },

      // Get signature
      signBytes: ['validate', ({}, cbk) => {
        return args.lnd.signer.signMessage({
          key_loc: {key_family: args.key_family, key_index: args.key_index},
          msg: Buffer.from(args.preimage, 'hex'),
        },
        (err, res) => {
          if (!!err && err.message === unimplementedError) {
            return cbk([400, 'ExpectedSignerRpcLndBuildTagToSignBytes']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorWhenSigningBytes', {err}]);
          }

          if (!res) {
            return cbk([503, 'UnexpectedEmptyResponseWhenSigningBytes']);
          }

          if (!res.signature) {
            return cbk([503, 'ExpectedSignatureInSignMessageResponse']);
          }

          if (!res.signature.length) {
            return cbk([503, 'ExpectedSignatureInSignBytesResponse']);
          }

          return cbk(null, {signature: res.signature.toString('hex')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'signBytes'}, cbk));
  });
};
