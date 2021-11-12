const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncTimesSeries = require('async/timesSeries');
const asyncRetry = require('async/retry');
const {ECPair} = require('ecpair');
const {networks} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');
const {returnResult} = require('asyncjs-util');

const rpc = require('./rpc');

const {fromPublicKey} = ECPair;
const interval = retryCount => 2000 * Math.random();
const {p2pkh} = payments;
const retryTimes = 50;

/** Generate blocks on the chain daemon

  {
    [cert]: <TLS Cert For RPC Connection Buffer Object>
    [chain]: <Chain Type String>
    [count]: <Blocks to Generate Number>
    host: <Chain Daemon IP String>
    [key]: <Mining Key WIF String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    user: <RPC Username String>
  }

  @return via cbk or Promise
  {
    blocks: [<Block Hash Hex String>]
  }
*/
module.exports = ({cert, chain, count, host, key, pass, port, user}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!host) {
          return cbk([400, 'ExpectedChainRpcHostForGenerateBlocks']);
        }

        if (!pass) {
          return cbk([400, 'ExpectedChainRpcPassForGenerateBlocks']);
        }

        if (!port) {
          return cbk([400, 'ExpectedChainRpcPortForGenerateBlocks']);
        }

        if (!user) {
          return cbk([400, 'ExpectedChainRpcUserForGenerateBlocks']);
        }

        return cbk();
      },

      // Generate blocks
      generate: ['validate', async ({}, cbk) => {
        let cmd;
        let params;

        switch (chain) {
        case 'bitcoind':
          const miningKey = Buffer.from(key, 'hex');
          const network = networks.testnet;

          const pubkey = fromPublicKey(miningKey, network).publicKey;

          cmd = 'generatetoaddress';
          params = [[count].length, p2pkh({network, pubkey}).address];
          break;

        default:
          cmd = 'generate';
          params = [[count].length];
          break;
        }

        return asyncTimesSeries(count, (i, cbk) => {
          return rpc({
            cert,
            cmd,
            host,
            params,
            pass,
            port,
            user,
          },
          (err, res) => {
            if (!!err) {
              return cbk([503, 'UnexpectedErrorGeneratingBlocks']);
            }

            if (!res) {
              return cbk();
            }

            if (!Array.isArray(res)) {
              return cbk([503, 'ExpectedBlockHashesForBlockGeneration', res]);
            }

            const [blockId] = res;

            return cbk(null, blockId);
          });
        },
        cbk);
      }],

      // Get blocks with transaction ids
      blocks: ['generate', ({generate}, cbk) => {
        const cmd = 'getblock';

        return asyncMap(generate.filter(n => !!n), (blockId, cbk) => {
          const opts = {cert, cmd, host, pass, port, user, params: [blockId]};

          return asyncRetry({interval, times: retryTimes}, cbk => {
            return rpc(opts, (err, res) => {
              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingBlock', {err}]);
              }

              if (!res || !Array.isArray(res.tx)) {
                return cbk([503, 'ExpectedBlockTransactionsForBlock', res]);
              }

              return cbk(null, {id: blockId, transaction_ids: res.tx});
            });
          },
          cbk);
        },
        cbk);
      }],

      // Final result
      generation: ['blocks', ({blocks}, cbk) => {
        return cbk(null, {blocks})
      }],
    },
    returnResult({reject, resolve, of: 'generation'}, cbk));
  });
};
