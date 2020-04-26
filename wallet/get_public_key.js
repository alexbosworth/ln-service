const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

/** Get a public key in the seed

  Requires LND compiled with `walletrpc` build tag

  Requires `address:read` permission

  {
    family: <Key Family Number>
    index: <Key Index Number>
    lnd: <Authenticated API LND Object>
  }

  @returns via cbk or Promise
  {
    public_key: <Public Key Hex String>
  }
*/
module.exports = ({family, index, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (family === undefined) {
          return cbk([400, 'ExpectedKeyFamilyToGetPublicKey']);
        }

        if (index === undefined) {
          return cbk([400, 'ExpectedKeyIndexToGetPublicKey']);
        }

        if (!lnd || !lnd.wallet || !lnd.wallet.deriveKey) {
          return cbk([400, 'ExpectedWalletRpcLndToGetPublicKey']);
        }

        return cbk();
      },

      // Get public key
      getPublicKey: ['validate', ({}, cbk) => {
        return lnd.wallet.deriveKey({
          key_family: family,
          key_index: index,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrGettingPublicKeyFromSeed', {err}]);
          }

          if (!res) {
            return cbk([503, 'UnexpectedResultInDerivePublicKeyResponse']);
          }

          if (!Buffer.isBuffer(res.raw_key_bytes)) {
            return cbk([503, 'ExpectedRawPubKeyBytesInDerivePubKeyResponse']);
          }

          return cbk(null, {public_key: res.raw_key_bytes.toString('hex')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getPublicKey'}, cbk));
  });
};
