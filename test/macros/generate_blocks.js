const rpc = require('./rpc');

const cmd = 'generate';

/** Connect to node

  {
    cert: <TLS Cert For RPC Connection Buffer Object>
    count: <Blocks to Generate Number>
    host: <Chain Daemon IP String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    user: <RPC Username String>
  }
*/
module.exports = ({cert, count, host, pass, port, user}, cbk) => {
  const params = [count];

  return rpc({cert, cmd, host, params, pass, port, user}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGeneratingBlocks']);
    }

    return cbk();
  });
};

