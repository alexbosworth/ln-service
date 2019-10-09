const isHash = require('./is_hash');
const isTransaction = require('./is_transaction');
const subscribeToBlocks = require('./subscribe_to_blocks');
const subscribeToChainAddress = require('./subscribe_to_chain_address');
const subscribeToChainSpend = require('./subscribe_to_chain_spend');

module.exports = {
  isHash,
  isTransaction,
  subscribeToBlocks,
  subscribeToChainAddress,
  subscribeToChainSpend,
};
