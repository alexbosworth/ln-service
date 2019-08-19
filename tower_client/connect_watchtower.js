const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {unimplementedError} = require('./constants');

/** Connect to a watchtower

  This method requires LND built with wtclientrpc build tag

  {
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Watchtower Public Key Hex String>
    socket: <Network Socket Address IP:PORT String>
  }

  @returns via cbk or Promise
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return new asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.tower_client) {
          return cbk([400, 'ExpectedLndToConnectToWatchtower']);
        }

        if (!args.public_key) {
          return cbk([400, 'ExpectedPublicKeyOfWatchtowerToConnectTo']);
        }

        if (!args.socket) {
          return cbk([400, 'ExpectedSocketOfWatchtowerToConnectTo']);
        }

        return cbk();
      },

      // Add watchtower
      add: ['validate', ({}, cbk) => {
        return args.lnd.tower_client.addTower({
          address: args.socket,
          pubkey: Buffer.from(args.public_key, 'hex'),
        },
        err => {
          if (!!err && err.message === unimplementedError) {
            return cbk([503, 'ExpectedLndCompiledWithWtclientrpcBuildTag']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorConnectingWatchtower', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
