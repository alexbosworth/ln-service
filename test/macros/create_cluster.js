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
    target: {
      kill: <Kill Function>
      lnd: <Target LND GRPC Object>
    }
    target_node_public_key: <Target Node Public Key Hex String>
  }
*/
module.exports = ({}, cbk) => {
  return asyncAuto({
    // Create control lnd
    control: cbk => spawnLnd({}, cbk),

    // Create target lnd
    target: cbk => spawnLnd({}, cbk),

    // Get the chain rpc cert
    cert: ['control', ({control}, cbk) => {
      return cbk(null, readFileSync(control.chain_rpc_cert));
    }],

    // Get the target node info
    targetNode: ['target', ({target}, cbk) => {
      return getWalletInfo({lnd: target.lnd}, cbk);
    }],

    // Make a chain address
    createChainAddress: ['control', ({control}, cbk) => {
      return createChainAddress({format, lnd: control.lnd}, cbk);
    }],

    // Connect the chains together
    connectChains: [
      'cert',
      'control',
      'target',
      ({cert, control, target}, cbk) =>
    {
      return connectChainNode({
        cert,
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
      'cert',
      'connectChains',
      'control',
      ({cert, control}, cbk) =>
    {
      return generateBlocks({
        cert,
        count: maturityBlockCount,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],

    // Add peer
    addPeer: [
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

    // Generate some funds
    generateFunds: [
      'cert',
      'control',
      'createChainAddress',
      'generateBlocks',
      ({cert, control, createChainAddress, generateBlocks}, cbk) =>
    {
      const {blocks} = generateBlocks;

      const [block] = blocks;

      const [coinbaseTransaction] = block.transaction_ids;

      const {transaction} = chainSendTransaction({
        tokens,
        destination: createChainAddress.address,
        fee: defaultFee,
        private_key: control.mining_key,
        spend_transaction_id: coinbaseTransaction,
        spend_vout: defaultVout,
      });

      return mineTransaction({
        cert,
        transaction,
        host: control.listen_ip,
        pass: control.chain_rpc_pass,
        port: control.chain_rpc_port,
        user: control.chain_rpc_user,
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, {
      control: res.control,
      target: res.target,
      target_node_public_key: res.targetNode.public_key,
    });
  });
};

