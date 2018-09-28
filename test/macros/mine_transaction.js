const rpc = require('./rpc');

const generateBlocks = require('./generate_blocks');

const count = 6;

/** Mine a transaction into a block

  {
    cert: <TLS Cert For RPC Connection Buffer Object>
    host: <Chain Daemon IP String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    transaction: <Transaction Hex String>
    user: <RPC Username String>
  }
*/
module.exports = ({cert, host, pass, port, transaction, user}, cbk) => {
  if (!cert) {
    return cbk([400, 'ExpectedChainRpcCertForMiningTransaction']);
  }

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

  return rpc({
    cert,
    host,
    pass,
    port,
    user,
    cmd: 'sendrawtransaction',
    params: [transaction],
  },
  (err, id) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorBroadcastingTransaction', err]);
    }

    return generateBlocks({cert, count, host, pass, port, user}, cbk);
  });
};

