const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

/** Sign a message

  {
    lnd: <Authenticated LND gRPC API Object>
    message: <Message String>
  }

  @returns via cbk or Promise
  {
    signature: <Signature String>
  }
*/
module.exports = ({lnd, message}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.signMessage) {
          return cbk([400, 'ExpectedLndToSignMessage']);
        }

        if (!message) {
          return cbk([400, 'ExpectedMessageToSign']);
        }

        return cbk();
      },

      // Sign message
      sign: ['validate', ({}, cbk) => {
        return lnd.default.signMessage({
          msg: Buffer.from(message, 'utf8'),
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedSignMessageError', {err}]);
          }

          if (!res.signature) {
            return cbk([503, 'ExpectedSignatureForMessageSignRequest']);
          }

          return cbk(null, {signature: res.signature});
        });
      }],
    },
    returnResult({reject, resolve, of: 'sign'}, cbk));
  });
};
