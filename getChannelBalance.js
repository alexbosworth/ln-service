const {promisify} = require('util');

const {getChannelBalance} = require('./');

/** Get channel balance

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    channel_balance: <Channels Balance Tokens Number>
    pending_balance: <Pending Channels Balance Tokens Number>
  }
*/
module.exports = promisify(getChannelBalance);
