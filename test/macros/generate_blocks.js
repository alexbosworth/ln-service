const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncMapSeries = require('async/timesSeries');
const asyncRetry = require('async/retry');

const rpc = require('./rpc');

const retryMs = 200;
const retryTimes = 10;

/** Connect to node

  {
    cert: <TLS Cert For RPC Connection Buffer Object>
    count: <Blocks to Generate Number>
    host: <Chain Daemon IP String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    user: <RPC Username String>
  }

  @return via cbk
  {
    blocks: [<Block Hash Hex String>]
  }
*/
module.exports = ({cert, count, host, pass, port, user}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!cert) {
        return cbk([400, 'ExpectedChainRpcCertForGenerateBlocks']);
      }

      if (!count) {
        return cbk([400, 'ExpectedBlocksToGenerateCount']);
      }

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
    generate: ['validate', ({}, cbk) => {
      const cmd = 'generate';
      const params = [[count].length];

      return asyncMapSeries(count, ({}, cbk) => {
        return rpc({cert, cmd, host, params, pass, port, user}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGeneratingBlocks']);
          }

          if (!Array.isArray(res)) {
            return cbk([503, 'ExpectedBlockHashesForBlockGeneration']);
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

      return asyncMap(generate, (blockId, cbk) => {
        const opts = {cert, cmd, host, pass, port, user, params: [blockId]};

        return asyncRetry({interval: retryMs, times: retryTimes}, cbk => {
          return rpc(opts, (err, res) => {
            if (!!err) {
              return cbk([503, 'UnexpectedErrorGettingBlock']);
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
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, {blocks: res.blocks})
  });
};

