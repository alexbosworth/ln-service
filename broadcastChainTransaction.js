const {promisify} = require('util');

const {broadcastChainTransaction} = require('./');

/** Publish a raw blockchain transaction to Blockchain network peers

  {
    lnd: <Authenticated LND gRPC API Object>
    transaction: <Transaction Hex String>
  }

  @returns via Promise
  {
    id: <Transaction Id Hex String>
  }
*/
module.exports = promisify(broadcastChainTransaction);
