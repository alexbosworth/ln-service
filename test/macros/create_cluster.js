const {promisify} = require('util');

const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncRetry = require('async/retry');
const tinysecp = require('tiny-secp256k1');

const {addPeer} = require('./../../');
const chainSendTransaction = require('./chain_send_transaction');
const connectChainNode = require('./connect_chain_node');
const {createChainAddress} = require('./../../');
const generateBlocks = require('./generate_blocks');
const {getWalletInfo} = require('./../../');
const mineTransaction = require('./mine_transaction');
const rpc = require('./rpc');
const spawnLnd = require('./spawn_lnd');
const waitForTermination = require('./wait_for_termination');

const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const maturityBlockCount = 429;
const retryMs = 20;
const retryTimes = 1000;
const seed = 'abandon tank dose ripple foil subway close flock laptop cabbage primary silent plastic unhappy west weird panda plastic brave prefer diesel glad jazz isolate';
const tokens = 50e8;

/** Create a cluster of lnds

  {
    [is_circular_enabled]: <Allow Circular Payments Bool>
    [is_keysend_enabled]: <Nodes Accept Keysend Payments Bool>
    [is_remote_skipped]: <Is Remote Node Creation Skipped Bool>
    [nodes]: [{
      chain_rpc_cert: <RPC Cert Path String>
      chain_rpc_pass: <Chain RPC Password String>
      chain_rpc_port: <RPC Port Number>
      chain_rpc_user: <Chain RPC Username String>
      kill: <Kill Function>
      listen_ip: <Listen Ip String>
    }]
  }

  @returns via cbk
  {
    control: {
      kill: <Kill Function>
      lnd: <Authenticated LND gRPC Object>
    }
    generate: <Generate Function> ({node, count}) -> (err) -> ()
    kill: <Kill Nodes Promise Function>
    [remote]: {
      kill: <Kill Function>
      lnd: <Authenticated LND gRPC Object>
    }
    target: {
      kill: <Kill Function>
      lnd: <Authenticated LND gRPC Object>
    }
    [remote_node_public_key]: <Remote Node Public Key Hex String>
    target_node_public_key: <Target Node Public Key Hex String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Import ECPair library
    ecp: async () => (await import('ecpair')).ECPairFactory(tinysecp),

    // Create control lnd
    control: cbk => {
      return spawnLnd({
        seed,
        circular: args.is_circular_enabled,
        keysend: args.is_keysend_enabled,
      },
      cbk);
    },

    // Create target lnd
    target: cbk => {
      return spawnLnd({
        circular: args.is_circular_enabled,
        keysend: args.is_keysend_enabled,
      },
      cbk);
    },

    // Create remote lnd
    remote: cbk => {
      if (!!args.is_remote_skipped) {
        return cbk();
      }

      return spawnLnd({
        circular: args.is_circular_enabled,
        keysend: args.is_keysend_enabled,
      },
      cbk);
    },

    // Get the remote node info
    remoteNode: ['remote', ({remote}, cbk) => {
      if (!!args.is_remote_skipped) {
        return cbk();
      }

      return getWalletInfo({lnd: remote.lnd}, cbk);
    }],

    // Get the chain rpc cert
    controlCert: ['control', ({control}, cbk) => {
      return cbk(null, control.chain_rpc_cert_file);
    }],

    // Get the target rpc cert
    targetCert: ['target', ({target}, cbk) => {
      return cbk(null, target.chain_rpc_cert_file);
    }],

    // Get the target node info
    targetNode: ['target', ({target}, cbk) => {
      return getWalletInfo({lnd: target.lnd}, cbk);
    }],

    // Make a chain address for control
    controlChainAddress: ['control', ({control}, cbk) => {
      return createChainAddress({format, lnd: control.lnd}, cbk);
    }],

    // Make a chain address for target
    targetChainAddress: ['target', ({target}, cbk) => {
      return createChainAddress({format, lnd: target.lnd}, cbk);
    }],

    // Connect target and remote chains together
    connectRemoteAndTargetChain: [
      'control',
      'controlCert',
      'remote',
      ({control, controlCert, remote}, cbk) =>
    {
      if (!!args.is_remote_skipped) {
        return cbk();
      }

      return connectChainNode({
        cert: controlCert,
        connect: `127.0.0.1:${remote.chain_listen_port}`,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],

    connectExtra: ['target', ({target}, cbk) => {
      return asyncEach(args.nodes || [], (node, cbk) => {
        return connectChainNode({
          cert: node.chain_rpc_cert_file,
          connect: `127.0.0.1:${target.chain_listen_port}`,
          host: node.listen_ip,
          pass: node.chain_rpc_pass,
          port: node.chain_rpc_port,
          user: node.chain_rpc_user,
        },
        cbk);
      },
      cbk);
    }],

    // Connect control and target chains together
    connectTargetChain: [
      'control',
      'controlCert',
      'target',
      ({control, controlCert, target}, cbk) =>
    {
      return connectChainNode({
        cert: controlCert,
        connect: `127.0.0.1:${target.chain_listen_port}`,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],

    // Generate blocks to maturity
    generateBlocks: [
      'connectRemoteAndTargetChain',
      'connectTargetChain',
      'control',
      'controlCert',
      ({control, controlCert}, cbk) =>
    {
      return generateBlocks({
        cert: controlCert,
        count: maturityBlockCount,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],

    // Add target peer
    addTargetPeer: [
      'control',
      'generateBlocks',
      'target',
      'targetNode',
      ({control, target, targetNode}, cbk) =>
    {
      return asyncRetry({interval: retryMs, times: retryTimes}, cbk => {
        return addPeer({
          lnd: control.lnd,
          public_key: targetNode.public_key,
          socket: target.socket,
        },
        cbk);
      },
      cbk);
    }],

    // Chain funding transactions
    funding: [
      'control',
      'controlChainAddress',
      'ecp',
      'generateBlocks',
      'targetChainAddress',
      ({
        control,
        controlChainAddress,
        ecp,
        generateBlocks,
        targetChainAddress,
      },
      cbk) =>
    {
      const {blocks} = generateBlocks;

      const [controlBlock, targetBlock] = blocks;

      const [controlCoinbase] = controlBlock.transaction_ids;
      const [targetCoinbase] = targetBlock.transaction_ids;

      const controlChainSend = chainSendTransaction({
        ecp,
        tokens,
        destination: controlChainAddress.address,
        fee: defaultFee,
        private_key: control.mining_key,
        spend_transaction_id: controlCoinbase,
        spend_vout: defaultVout,
      });

      const targetChainSend = chainSendTransaction({
        ecp,
        tokens,
        destination: targetChainAddress.address,
        fee: defaultFee,
        private_key: control.mining_key,
        spend_transaction_id: targetCoinbase,
        spend_vout: defaultVout,
      });

      return cbk(null, {
        control: controlChainSend.transaction,
        target: targetChainSend.transaction
      });
    }],

    // Generate some funds for control
    generateControlFunds: [
      'control',
      'controlCert',
      'funding',
      ({control, controlCert, funding}, cbk) =>
    {
      return mineTransaction({
        transaction: funding.control,
        cert: controlCert,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],

    // Generate some funds for target
    generateTargetFunds: [
      'connectRemoteAndTargetChain',
      'control',
      'controlCert',
      'funding',
      'generateControlFunds',
      ({control, controlCert, funding}, cbk) =>
    {
      return mineTransaction({
        transaction: funding.target,
        cert: controlCert,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],

    // Add remote peer
    addRemotePeer: [
      'connectRemoteAndTargetChain',
      'generateTargetFunds',
      'remote',
      'remoteNode',
      'target',
      ({remote, remoteNode, target}, cbk) =>
    {
      if (!!args.is_remote_skipped) {
        return cbk();
      }

      return asyncRetry({interval: retryMs, times: retryTimes}, cbk => {
        return addPeer({
          lnd: target.lnd,
          public_key: remoteNode.public_key,
          socket: remote.socket,
        },
        cbk);
      },
      cbk);
    }],

    // Delay so that all the nodes can sync to the chain
    syncToChain: [
      'addRemotePeer',
      'control',
      'remote',
      'target',
      ({control, remote, target}, cbk) =>
    {
      return asyncEach([control, remote, target], (node, cbk) => {
        if (!node) {
          return cbk();
        }

        return asyncRetry({interval: retryMs, times: retryTimes}, cbk => {
          return getWalletInfo({lnd: node.lnd}, (err, res) => {
            if (!!err) {
              return cbk(err);
            }

            if (!res.is_synced_to_chain) {
              return cbk([503, 'NodeWaitingToSyncToChain']);
            }

            return cbk();
          });
        },
        cbk);
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err && !!res.control) {
      res.control.kill();
    }

    if (!!err && !!res.remote && !!res.remote.kill) {
      res.remote.kill();
    }

    if (!!err && !!res.target) {
      res.target.kill();
    }

    if (!!err) {
      return cbk(err);
    }

    const {control} = res;
    const {remote} = res;
    const {remoteNode} = res;
    const {target} = res;

    const kill = promisify((args, cbk) => {
      const nodes = [control, remote, target].concat(args.nodes)
        .filter(n => !!n);

      nodes.forEach(({kill}) => kill());

      return asyncEach(nodes, ({lnd}, cbk) => {
        return waitForTermination({lnd}, cbk);
      },
      cbk);
    });

    const generate = async (args, cbk) => {
      return generateBlocks({
        cert: (args.node || control).chain_rpc_cert_file,
        count: args.count || 1,
        host: (args.node || control).listen_ip,
        pass: (args.node || control).chain_rpc_pass,
        port: (args.node || control).chain_rpc_port,
        user: (args.node || control).chain_rpc_user,
      },
      cbk);
    };

    return cbk(null, {
      control,
      kill,
      remote,
      generate,
      target,
      remote_node_public_key: !remoteNode ? null : remoteNode.public_key,
      target_node_public_key: res.targetNode.public_key,
    });
  });
};
