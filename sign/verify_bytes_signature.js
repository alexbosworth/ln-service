const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const unimplementedError = '12 UNIMPLEMENTED: unknown service signrpc.Signer';

/** Verify signature of arbitrary bytes

  Requires LND built with `signerrpc` build tag

  This method is not supported in LND v0.8.2 and below

  {
    lnd: <Authenticated LND gRPC API Object>
    preimage: <Message Preimage Bytes Hex Encoded String>
    public_key: <Signature Valid For Public Key Hex String>
    signature: <Signature Hex String>
  }

  @returns via cbk or Promise
  {
    is_valid: <Signature is Valid Bool>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd: args.lnd, method: 'verifyMessage', type: 'signer'})) {
          return cbk([400, 'ExpectedLndToVerifyBytesSignature']);
        }

        if (!isHex(args.preimage)) {
          return cbk([400, 'ExpectedPreimageToVerifyBytesSignature'])
        }

        if (!isHex(args.public_key)) {
          return cbk([400, 'ExpectedPublicKeyToVerifyBytesSignature']);
        }

        if (!isHex(args.signature)) {
          return cbk([400, 'ExpectedSignatureToVerifyBytesSignature']);
        }

        return cbk();
      },

      // Verify signature
      verify: ['validate', ({}, cbk) => {
        return args.lnd.signer.verifyMessage({
          msg: Buffer.from(args.preimage, 'hex'),
          pubkey: Buffer.from(args.public_key, 'hex'),
          signature: Buffer.from(args.signature, 'hex'),
        },
        (err, res) => {
          if (!!err && err.message === unimplementedError) {
            return cbk([400, 'ExpectedSignerRpcLndBuildTagToVerifySignBytes']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrWhenVerifyingSignedBytes', {err}]);
          }

          if (!res) {
            return cbk([503, 'UnexpectedEmptyResponseWhenVerifyingBytesSig']);
          }

          if (res.valid === undefined) {
            return cbk([503, 'ExpectedValidStateOfSignatureOverBytes']);
          }

          return cbk(null, {is_valid: res.valid});
        });
      }],
    },
    returnResult({reject, resolve, of: 'verify'}, cbk));
  });
};
