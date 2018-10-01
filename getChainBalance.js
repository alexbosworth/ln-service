const {promisify} = require('util');

const {getChainBalance} = require('./');

/** Get balance

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    chain_balance: <Confirmed Chain Balance Tokens Number>
  }
*/
module.exports = promisify(getChainBalance);

