const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

/** Verify a message was signed by a known pubkey

  {
    lnd: <Authenticated LND gRPC API Object>
    message: <Message String>
    signature: <Signature String>
  }

  @returns via cbk or Promise
  {
    [signed_by]: <Public Key String>
  }
*/
module.exports = ({lnd, message, signature}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.verifyMessage) {
          return cbk([400, 'ExpectedLndForVerifyMessage']);
        }

        if (!message) {
          return cbk([400, 'ExpectedMessageToVerify']);
        }

        if (!signature) {
          return cbk([400, 'ExpectedSignatureToVerifyAgainst']);
        }

        return cbk();
      },

      // Check message
      verify: ['validate', ({}, cbk) => {
        const msg = Buffer.from(message, 'utf8');

        return lnd.default.verifyMessage({msg, signature}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedVerifyMessageError', {err}]);
          }

          if (!res.pubkey) {
            return cbk([503, 'ExpectedPublicKeyInVerifyMessageResponse']);
          }

          if (!res.valid) {
            return cbk(null, {signed_by: res.pubkey, valid:res.valid});
          }

          return cbk(null, {signed_by: res.pubkey, valid:res.valid});
        });
      }],
    },
    returnResult({reject, resolve, of: 'verify'}, cbk));
  });
};
