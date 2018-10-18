const {promisify} = require('util');
const {readFileSync} = require('fs');

const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');

const {addPeer} = require('./../../');
const chainSendTransaction = require('./chain_send_transaction');
const connectChainNode = require('./connect_chain_node');
const {createChainAddress} = require('./../../');
const generateBlocks = require('./generate_blocks');
const {getWalletInfo} = require('./../../');
const mineTransaction = require('./mine_transaction');
const spawnLnd = require('./spawn_lnd');

const defaultFee = 1e3;
const defaultVout = 0;
const format = 'np2wpkh';
const maturityBlockCount = 430;
const retryMs = 200;
const retryTimes = 10;
const tokens = 1e8;

/** Create a cluster of lnds

  {}

  @returns via cbk
  {
    control: {
      kill: <Kill Function>
      lnd: <Control LND GRPC Object>
    }
    generate: <Generate Function> ({node, count}) -> (err) -> ()
    kill: <Kill Nodes Function>
    remote: {
      kill: <Kill Function>
      lnd: <Remote LND GRPC Object>
    }
    target: {
      kill: <Kill Function>
      lnd: <Target LND GRPC Object>
    }
    remote_node_public_key: <Remote Node Public Key Hex String>
    target_node_public_key: <Target Node Public Key Hex String>
  }
*/
module.exports = ({}, cbk) => {
  return asyncAuto({
    // Create control lnd
    control: cbk => spawnLnd({}, cbk),

    // Create target lnd
    target: cbk => spawnLnd({}, cbk),

    // Create remote lnd
    remote: cbk => spawnLnd({}, cbk),

    // Get the remote node info
    remoteNode: ['remote', ({remote}, cbk) => {
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
      return addPeer({
        lnd: target.lnd,
        public_key: remoteNode.public_key,
        socket: `${remote.listen_ip}:${remote.listen_port}`,
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err && !!res.control) {
      res.control.kill();
    }

    if (!!err && !!res.remote) {
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
    const {target} = res;

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
      remote,
      generate,
      target,
      kill: () => [control, remote, target].forEach(({kill}) => kill()),
      remote_node_public_key: res.remoteNode.public_key,
      target_node_public_key: res.targetNode.public_key,
    });
  });
};

