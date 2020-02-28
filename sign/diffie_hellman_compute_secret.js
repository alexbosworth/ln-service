const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const defaultKeyFamily = 6;
const defaultKeyIndex = 0;
const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const method = 'deriveSharedKey';
const type = 'signer';
const unimplementedError = 'unknown service signrpc.Signer';

/** Derive a shared secret

  Key family and key index default to 6 and 0, which is the node identity key

  Requires LND built with `signerrpc` build tag

  This method is not supported in LND v0.8.2 and below

  {
    [key_family]: <Key Family Number>
    [key_index]: <Key Index Number>
    lnd: <Authenticated LND gRPC API Object>
    partner_public_key: <Public Key Hex String>
  }

  @returns via cbk or Promise
  {
    secret: <Shared Secret Hex String>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({method, type, lnd: args.lnd})) {
          return cbk([400, 'ExpectedAuthenticatedLndToComputeSharedSecret']);
        }

        if (!args.partner_public_key || !isHex(args.partner_public_key)) {
          return cbk([400, 'ExpectedHexEncodedPartnerPublicKey']);
        }

        return cbk();
      },

      // Derive the shared key
      deriveKey: ['validate', ({}, cbk) => {
        return args.lnd[type][method]({
          ephemeral_pubkey: Buffer.from(args.partner_public_key, 'hex'),
          key_loc: {
            key_family: args.key_family || defaultKeyFamily,
            key_index: args.key_index || defaultKeyIndex,
          },
        },
        (err, res) => {
          if (!!err && err.details === unimplementedError) {
            return cbk([400, 'ExpectedLndWithSupportForDeriveSharedKey']);
          }

          if (!!err) {
            return cbk([503, 'UnexpetedErrorDerivingSharedKey', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultOfDeriveSharedKeyRequest']);
          }

          if (!Buffer.isBuffer(res.shared_key)) {
            return cbk([503, 'ExpectedSharedKeyBufferInDeriveKeyResponse']);
          }

          if (!res.shared_key.length) {
            return cbk([503, 'UnexpectedSharedKeyLengthInDeriveKeyResponse']);
          }

          return cbk(null, {secret: res.shared_key.toString('hex')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'deriveKey'}, cbk));
  });
};
