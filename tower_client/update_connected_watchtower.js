const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {returnResult} = require('asyncjs-util');

const {unimplementedError} = require('./constants');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const times = 10;

/** Update a watchtower

  Requires LND built with wtclientrpc build tag

  {
    [add_socket]: <Add Socket String>
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Watchtower Public Key Hex String>
    [remove_socket]: <Remove Socket String>
  }

  @returns via cbk or Promise
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check argument
      validate: cbk => {
        if (!args.add_socket && !args.remove_socket) {
          return cbk([400, 'ExpectedASocketToAddToOrRemoveFromWatchtower']);
        }

        if (!args.lnd || !args.lnd.tower_client) {
          return cbk([400, 'ExpectedAuthenticatedLndToUpdateWatchtower']);
        }

        if (!args.public_key) {
          return cbk([400, 'ExpectedPublicKeyToUpdateWatchtower']);
        }

        return cbk();
      },

      // Add socket
      addSocket: ['validate', ({}, cbk) => {
        // Exit early when there is no socket to add
        if (!args.add_socket) {
          return cbk();
        }

        return args.lnd.tower_client.addTower({
          address: args.add_socket,
          pubkey: Buffer.from(args.public_key, 'hex'),
        },
        err => {
          if (!!err) {
            return cbk([503, 'UnexpectedAddSocketToWatchtowerError', {err}]);
          }

          return cbk();
        });
      }],

      // Remove socket
      removeSocket: ['validate', ({}, cbk) => {
        // Exit early when there is no socket to remove
        if (!args.remove_socket) {
          return cbk();
        }

        return asyncRetry({interval, times}, cbk => {
          return args.lnd.tower_client.removeTower({
            address: args.remove_socket,
            pubkey: Buffer.from(args.public_key, 'hex'),
          },
          err => {
            if (!!err && err.message === unimplementedError) {
              return cbk([503, 'ExpectedWatchtowerClientLndToGetPolicy']);
            }

            if (!!err) {
              return cbk([503, 'UnexpectedRemoveSocketFromTowerError', {err}]);
            }

            return cbk();
          });
        },
        cbk);
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
