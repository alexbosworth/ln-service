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
    fee: <Fee Tokens Number>
    fee_mtokens: <Fee Millitokens Number>
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      timeout: <Timeout Block Height Number>
      mtokens: <Total Millitokens String>
      tokens: <Total Tokens Number>
      hops: [{
        channel_id: <BOLT 07 Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        timeout: <Timeout Block Height Number>
      }]
    }]
    mtokens: <Total Millitokens To Send String>
    timeout: <Total CLTV Timelock Number>
    tokens: <Total Tokens to Send Number>
  }
*/
module.exports = promisify(getRoutes);

