const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const connectionFailure = '14 UNAVAILABLE: Connect Failed';
const expectedMnemonicLength = 24;
const {isArray} = Array;

/** Create a wallet seed

  Requires unlocked lnd and unauthenticated LND gRPC API Object

  {
    lnd: <Unauthenticed LND gRPC API Object>
    [passphrase]: <Seed Passphrase String>
  }

  @returns via cbk or Promise
  {
    seed: <Cipher Seed Mnemonic String>
  }
*/
module.exports = ({lnd, passphrase}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd, method: 'genSeed', type: 'unlocker'})) {
          return cbk([400, 'ExpectedNonAuthenticatedLndForSeedCreation']);
        }

        return cbk();
      },

      // Create seed
      createSeed: ['validate', ({}, cbk) => {
        const pass = !passphrase ? undefined : Buffer.from(passphrase, 'utf8');

        return lnd.unlocker.genSeed({aezeed_passphrase: pass}, (err, res) => {
          if (!!err && err.message === connectionFailure) {
            return cbk([503, 'UnexpectedConnectionFailure']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedCreateSeedError', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseForSeedCreation']);
          }

          if (!isArray(res.cipher_seed_mnemonic)) {
            return cbk([503, 'ExpectedCipherSeedMnemonic']);
          }

          if (res.cipher_seed_mnemonic.length !== expectedMnemonicLength) {
            return cbk([503, 'UnexpectedCipherSeedMnemonicLength']);
          }

          return cbk(null, {seed: res.cipher_seed_mnemonic.join(' ')});
        });
      }],
    },
    returnResult({reject, resolve, of: 'createSeed'}, cbk));
  });
};
