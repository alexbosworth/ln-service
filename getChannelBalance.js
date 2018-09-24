const {promisify} = require('util');

const {getChannelBalance} = require('./');

/** Get channel balance

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    channel_balance: <Channels Balance Tokens>
  }
*/
module.exports = promisify(getChannelBalance);

