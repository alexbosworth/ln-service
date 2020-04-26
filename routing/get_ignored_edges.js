const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {getChannel} = require('lightning/lnd_methods');
const {returnResult} = require('asyncjs-util');

const {isArray} = Array;
const notFoundIndex = -1;

/** Get a filled-out list of ignore edges where missing pubkeys are added

  {
    ignores: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    ignores: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
  }
*/
module.exports = ({ignores, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isArray(ignores)) {
          return cbk([400, 'ExpectedIgnoreArrayToGetIgnoreEdges']);
        }

        if (ignores.findIndex(n => !n) !== notFoundIndex) {
          return cbk([400, 'ExpectedIgnoreArrayElementsToGetIgnoreEdges']);
        }

        const chans = ignores.filter(n => !!n.channel);

        // Channel ignores must contain a direction
        if (!!chans.find(n => !n.to_public_key && !n.from_public_key)) {
          return cbk([400, 'ExpectedPublicKeyDirectionalityInIgnoredEdge']);
        }

        if (!lnd) {
          return cbk([400, 'ExpectedAuthenticatedLndToGetIgnoredEdges']);
        }

        return cbk();
      },

      // Channels without a public key have to be fetched to find the key
      chans: ['validate', ({}, cbk) => {
        const channels = ignores
          .filter(({channel}) => !!channel)
          .filter(n => !n.from_public_key || !n.to_public_key)
          .map(({channel}) => channel);

        return cbk(null, channels);
      }],

      // Get channels
      getChannels: ['chans', ({chans}, cbk) => {
        return asyncMap(chans, (id, cbk) => getChannel({id, lnd}, cbk), cbk);
      }],

      // Assemble ignores
      ignores: ['getChannels', ({getChannels}, cbk) => {
        const list = ignores.map(ignore => {
          if (!ignore.channel) {
            return {
              from_public_key: ignore.from_public_key,
              to_public_key: ignore.to_public_key,
            };
          }

          if (!!ignore.from_public_key && !!ignore.to_public_key) {
            return {
              channel: ignore.channel,
              from_public_key: ignore.from_public_key,
              to_public_key: ignore.to_public_key,
            };
          }

          const channel = getChannels.find(n => n.id === ignore.channel);

          const {policies} = channel;

          const keys = policies.map(n => n.public_key);

          const fromKey = keys.find(n => n !== ignore.to_public_key);
          const toKey = keys.find(n => n !== ignore.from_public_key);

          return {
            channel: ignore.channel,
            from_public_key: ignore.from_public_key || fromKey,
            to_public_key: ignore.to_public_key || toKey,
          };
        });

        return cbk(null, {ignores: list});
      }],
    },
    returnResult({reject, resolve, of: 'ignores'}, cbk));
  });
};
