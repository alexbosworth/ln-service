const {promisify} = require('util');

const {getPendingChainBalance} = require('./');

/** Get pending chain balance.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    pending_chain_balance: <Pending Chain Balance Tokens Number>
  }
*/
module.exports = promisify(getPendingChainBalance);

