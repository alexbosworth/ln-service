const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);

/** Remove a peer if possible

  Requires `peers:remove` permission

  {
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Public Key Hex String>
  }

  @returns via cbk or Promise
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default) {
          return cbk([400, 'ExpectedLndForPeerDisconnection']);
        }

        if (!args.public_key || !isHex(args.public_key)) {
          return cbk([400, 'ExpectedPublicKeyOfPeerToRemove']);
        }

        return cbk();
      },

      // Disconnect
      disconnect: ['validate', ({}, cbk) => {
        return args.lnd.default.disconnectPeer({
          pub_key: args.public_key,
        },
        err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorRemovingPeer', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
