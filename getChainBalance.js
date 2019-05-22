const {promisify} = require('util');

const {getChainBalance} = require('./');

/** Get balance

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    chain_balance: <Confirmed Chain Balance Tokens Number>
  }
*/
module.exports = promisify(getChainBalance);
