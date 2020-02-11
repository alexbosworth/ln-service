const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');
const {unimplementedError} = require('./constants');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const method = 'removeTower';
const times = 10;
const type = 'tower_client';

/** Disconnect a watchtower

  Requires LND built with wtclientrpc build tag

  {
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Watchtower Public Key Hex String>
  }

  @returns via cbk or Promise
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return new asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({method, type, lnd: args.lnd})) {
          return cbk([400, 'ExpectedLndToDisconnectWatchtower']);
        }

        if (!args.public_key) {
          return cbk([400, 'ExpectedPublicKeyOfWatchtowerToDisconnect']);
        }

        return cbk();
      },

      // Remove watchtower
      remove: ['validate', ({}, cbk) => {
        return asyncRetry({interval, times}, cbk => {
          return args.lnd.tower_client.removeTower({
            pubkey: Buffer.from(args.public_key, 'hex'),
          },
          err => {
            if (!!err && err.message === unimplementedError) {
              return cbk([503, 'ExpectedWatchtowerClientLndToGetPolicy']);
            }

            if (!!err) {
              return cbk([503, 'UnexpectedErrDisconnectingWatchtower', {err}]);
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
