const {join} = require('path');
const {tmpdir} = require('os');

const removeDir = require('rimraf');
const {v4} = require('uuid');

const btcsuiteTypeDaemon = require('./btcsuite_type_daemon');

/** Spawn a chain daemon for testing on regtest

  This method will also listen for uncaught exceptions and stop the daemon
  before the process dies.

  {
    daemon: <Daemon Type String>
    [is_tls]: <Uses TLS Bool> // only supported for btcsuite type
    mining_public_key: <Mining Public Key Hex String>
  }

  @returns via cbk
  {
    daemon: <Daemon Child Process Object>
    dir: <Data Dir Path String>
    listen_port: <Listen Port Number>
    [rpc_cert]: <RPC Cert Path String>
    rpc_port: <RPC Port Number>
  }
*/
module.exports = (args, cbk) => {
  if (!args.daemon) {
    return cbk([400, 'ExpectedDaemonTypeToSpawn']);
  }

  let daemon;

  const dir = join(tmpdir(), v4());

  switch (args.daemon) {
  case 'btcd':
    daemon = btcsuiteTypeDaemon({
      dir,
      daemon: args.daemon,
      is_tls: args.is_tls,
      mining_public_key: args.mining_public_key,
    },
    (err, res) => {
      if (!!err) {
        return cbk(err);
      }

      res.daemon.stderr.on('data', data => {
        if (/mandatory.script.verify.flag/gim.test(data+'')) {
          return;
        }

        if (/txn.already.in.mempool/gim.test(data+'')) {
          return;
        }

        return;
      });

      res.daemon.on('close', code => removeDir(dir, () => {}));

      process.setMaxListeners(20);

      process.on('uncaughtException', err => {
        res.daemon.kill();
        process.exit(1)
      });

      return cbk(null, {
        dir,
        daemon: res.daemon,
        listen_port: res.listen_port,
        rpc_cert: join(dir, 'rpc.cert'),
        rpc_port: res.rpc_port,
      });
    });
    break;

  default:
    return cbk([400, 'UnknownDaemonType', args.daemon]);
  }

  return;
};

