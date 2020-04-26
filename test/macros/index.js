const {promisify} = require('util');

const chainSendTransaction = require('./chain_send_transaction');
const changePassword = promisify(require('./change_password'));
const connectChainNode = promisify(require('./connect_chain_node'));
const createCluster = promisify(require('./create_cluster'));
const delay = promisify(setTimeout);
const generateBlocks = promisify(require('./generate_blocks'));
const getRawTransaction = require('./get_raw_transaction');
const mineTransaction = promisify(require('./mine_transaction'));
const setupChannel = require('./setup_channel');
const spawnLnd = promisify(require('./spawn_lnd'));
const waitForChannel = promisify(require('./wait_for_channel'));
const waitForPendingChannel = promisify(require('./wait_for_pending_channel'));
const waitForRoute = promisify(require('./wait_for_route'));
const waitForTermination = promisify(require('./wait_for_termination'));
const waitForUtxo = promisify(require('./wait_for_utxo'));

module.exports = {
  chainSendTransaction,
  changePassword,
  connectChainNode,
  createCluster,
  delay,
  generateBlocks,
  getRawTransaction,
  mineTransaction,
  setupChannel,
  spawnLnd,
  waitForChannel,
  waitForPendingChannel,
  waitForRoute,
  waitForTermination,
  waitForUtxo,
};
