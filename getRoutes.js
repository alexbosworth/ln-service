const {promisify} = require('util');

const {getRoutes} = require('./lightning');

/** Get payment routes

  {
    destination: <Send Destination Hex Encoded Public Key String>
    [fee]: <Maximum Fee Tokens Number>
    [limit]: <Limit Results Count Number>
    lnd: <LND GRPC API Object>
    [timeout]: <Final CLTV Timeout Blocks Delta Number>
    tokens: <Tokens to Send Number>
  }

  @returns via Promise
  {
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      mtokens: <Total Millitokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Tokens Number>
      hops: [{
        channel_capacity: <Channel Capacity Tokens Number>
        channel_id: <BOLT 07 Encoded Channel Id String>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        timeout: <Timeout Block Height Number>
      }]
    }]
  }
*/
module.exports = promisify(getRoutes);

