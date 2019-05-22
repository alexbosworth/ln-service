const {promisify} = require('util');
const {readFileSync} = require('fs');

const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncRetry = require('async/retry');

const {addPeer} = require('./../../');
const chainSendTransaction = require('./chain_send_transaction');
const connectChainNode = require('./connect_chain_node');
const {createChainAddress} = require('./../../');
const generateBlocks = require('./generate_blocks');
const {getWalletInfo} = require('./../../');
const mineTransaction = require('./mine_transaction');
const spawnLnd = require('./spawn_lnd');
const waitForTermination = require('./wait_for_termination');

const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const maturityBlockCount = 429;
const retryMs = 200;
const retryTimes = 50;
const seed = 'abandon tank dose ripple foil subway close flock laptop cabbage primary silent plastic unhappy west weird panda plastic brave prefer diesel glad jazz isolate';
const tokens = 50e8;

/** Create a cluster of lnds

  {
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
    kill: <Kill Nodes Function>
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
    // Create control lnd
    control: cbk => spawnLnd({seed}, cbk),

    // Create target lnd
    target: cbk => spawnLnd({}, cbk),

    // Create remote lnd
    remote: cbk => {
      if (!!args.is_remote_skipped) {
        return cbk();
      }

      return spawnLnd({}, cbk);
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
      return cbk(null, readFileSync(control.chain_rpc_cert));
    }],

    // Get the target rpc cert
    targetCert: ['target', ({target}, cbk) => {
      return cbk(null, readFileSync(target.chain_rpc_cert));
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
        connect: `${remote.listen_ip}:${remote.chain_listen_port}`,
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
          cert: readFileSync(node.chain_rpc_cert),
          connect: `${target.listen_ip}:${target.chain_listen_port}`,
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
        connect: `${target.listen_ip}:${target.chain_listen_port}`,
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
          socket: `${target.listen_ip}:${target.listen_port}`,
        },
        cbk);
      },
      cbk);
    }],

    // Chain funding transactions
    funding: [
      'control',
      'controlChainAddress',
      'generateBlocks',
      'targetChainAddress',
      ({
        control,
        controlChainAddress,
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
        tokens,
        destination: controlChainAddress.address,
        fee: defaultFee,
        private_key: control.mining_key,
        spend_transaction_id: controlCoinbase,
        spend_vout: defaultVout,
      });

      const targetChainSend = chainSendTransaction({
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
          socket: `${remote.listen_ip}:${remote.listen_port}`,
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

    const generate = promisify((args, cbk) => {
      return generateBlocks({
        cert: readFileSync((args.node || control).chain_rpc_cert),
        count: args.count,
        host: (args.node || control).listen_ip,
        pass: (args.node || control).chain_rpc_pass,
        port: (args.node || control).chain_rpc_port,
        user: (args.node || control).chain_rpc_user,
      },
      cbk);
    });

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
