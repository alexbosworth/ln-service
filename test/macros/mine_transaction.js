const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const generateBlocks = require('./generate_blocks');
const rpc = require('./rpc');

const count = 6;

/** Mine a transaction into a block

  {
    cert: <TLS Cert For RPC Connection Buffer Object>
    [chain]: <Chain Type String>
    host: <Chain Daemon IP String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    transaction: <Transaction Hex String>
    user: <RPC Username String>
  }

  @returns via cbk or Promise
*/
module.exports = ({cert, chain, host, pass, port, transaction, user}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!host) {
          return cbk([400, 'ExpectedChainRpcHostForMiningTransaction']);
        }

        if (!pass) {
          return cbk([400, 'ExpectedChainRpcPassForMiningTransaction']);
        }

        if (!port) {
          return cbk([400, 'ExpectedChainRpcPortForMiningTransaction']);
        }

        if (!transaction) {
          return cbk([400, 'ExpectedTransactionToMineIntoBlock']);
        }

        if (!user) {
          return cbk([400, 'ExpectedChainRpcUserForMiningTransaction']);
        }

        return cbk();
      },

      // Broadcast
      broadcast: ['validate', ({}, cbk) => {
        return rpc({
          cert,
          host,
          pass,
          port,
          user,
          cmd: 'sendrawtransaction',
          params: [transaction],
        },
        err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorBroadcastingTransaction', {err}]);
          }

          return cbk();
        });
      }],

      // Generate
      generate: ['broadcast', ({}, cbk) => {
        return generateBlocks({
          cert,
          chain,
          count,
          host,
          pass,
          port,
          user,
        },
        cbk);
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
