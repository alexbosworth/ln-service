const {promisify} = require('util');

const chainSendTransaction = require('./chain_send_transaction');
const connectChainNode = promisify(require('./connect_chain_node'));
const delay = promisify(setTimeout);
const generateBlocks = promisify(require('./generate_blocks'));
const mineTransaction = promisify(require('./mine_transaction'));
const spawnLnd = promisify(require('./spawn_lnd'));

module.exports = {
  chainSendTransaction,
  connectChainNode,
  delay,
  generateBlocks,
  mineTransaction,
  spawnLnd,
};

