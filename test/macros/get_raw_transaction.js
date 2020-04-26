const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const rpc = require('./rpc');

const cmd = 'getrawtransaction';

/** Get a transaction

  {
    cert: <TLS Cert For RPC Connection Buffer Object>
    host: <Chain Daemon IP String>
    id: <Hex Encoded Transaction Hash String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    user: <RPC Username String>
  }

  @returns via cbk or PRomise
  {
    transaction: <Raw Transaction Hex String>
  }
*/
module.exports = ({cert, host, id, pass, port, user}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!cert) {
          return cbk([400, 'ExpectedChainRpcCertToGetRawTransaction']);
        }

        if (!host) {
          return cbk([400, 'ExpectedChainRpcHostToGetRawTransaction']);
        }

        if (!id) {
          return cbk([400, 'ExpectedTransactionIdToGetRawTransaction']);
        }

        if (!pass) {
          return cbk([400, 'ExpectedChainRpcPassToGetRawTransaction']);
        }

        if (!port) {
          return cbk([400, 'ExpectedChainRpcPortToGetRawTransaction']);
        }

        if (!user) {
          return cbk([400, 'ExpectedChainRpcUserForMiningTransaction']);
        }

        return cbk();
      },

      // Get the raw transaction
      getRawTransaction: ['validate', ({}, cbk) => {
        return rpc({
          cert,
          cmd,
          host,
          pass,
          port,
          user,
          params: [id],
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingTransaction', {err}]);
          }

          return cbk(null, {transaction: res});
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRawTransaction'}, cbk));
  });
};
