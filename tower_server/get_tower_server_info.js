const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const inactiveTowerErr = '2 UNKNOWN: watchtower not active';
const {isArray} = Array;
const {isBuffer} = Buffer;
const pubKeyLength = 33;

/** Get watchtower server info.

  This method requires LND built with `watchtowerrpc` build tag

  Requires `info:read` permission

  {
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    [tower]: {
      public_key: <Watchtower Server Public Key Hex String>
      sockets: [<Socket String>]
      uris: [<Watchtower External URI String>]
    }
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd, method: 'getInfo', type: 'tower_server'})) {
          return cbk([400, 'ExpectedAuthedLndGrpcToGetWatchtowerServerInfo']);
        }

        return cbk();
      },

      // Get info
      getInfo: ['validate', ({}, cbk) => {
        return lnd.tower_server.getInfo({}, (err, res) => {
          if (!!err && err.message === inactiveTowerErr) {
            return cbk(null, {});
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingTowerServerInfo', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseForTowerServerRequest']);
          }

          if (!isArray(res.listeners)) {
            return cbk([503, 'ExpectedArrayOfListenersForTowerServer']);
          }

          if (!!res.listeners.find(n => typeof(n) !== 'string')) {
            return cbk([503, 'ExpectedArrayOfListenerStrings']);
          }

          if (!isBuffer(res.pubkey) || res.pubkey.length !== pubKeyLength) {
            return cbk([503, 'ExpectedPublicKeyForTowerServer']);
          }

          if (!isArray(res.uris)) {
            return cbk([503, 'ExpectedArrayOfUrisForTowerServer']);
          }

          if (!!res.uris.find(n => typeof(n) !== 'string')) {
            return cbk([503, 'ExpectedArrayOfUriStrings']);
          }

          return cbk(null, {
            tower: {
              public_key: res.pubkey.toString('hex'),
              sockets: res.listeners,
              uris: res.uris,
            },
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getInfo'}, cbk));
  });
};
