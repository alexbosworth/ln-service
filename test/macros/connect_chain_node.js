const rpc = require('./rpc');

const addFlag = 'add';
const cmd = 'addnode';

/** Connect to node

  {
    [cert]: <TLS Cert For RPC Connection Buffer Object>
    connect: <Socket To Connect To String>
    host: <Chain Daemon IP String>
    pass: <RPC Password String>
    port: <RPC Port Number>
    user: <RPC Username String>
  }
*/
module.exports = ({cert, connect, host, pass, port, user}, cbk) => {
  const params = [connect, addFlag];

  return rpc({cert, cmd, host, params, pass, port, user}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorAddingNode', {err}]);
    }

    return cbk();
  });
};
