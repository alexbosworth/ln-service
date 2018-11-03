const {promisify} = require('util');

const {getRoutes} = require('./');

/** Get routes a payment can travel towards a destination

  Either a destination or extended routes are required.

  {
    [destination]: <Send Destination Hex Encoded Public Key String>
    [fee]: <Maximum Fee Tokens Number>
    [limit]: <Limit Results Count Number>
    lnd: <LND GRPC API Object>
    [routes]: [[{
      base_fee_mtokens: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      channel_id: <Channel Id String>
      cltv_delta: <CLTV Blocks Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]]
    [timeout]: <Final CLTV Timeout Blocks Delta Number>
    [tokens]: <Tokens to Send Number>
  }

  @returns via Promise
  {
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel_id: <BOLT 07 Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Tokens Number>
    }]
  }
*/
module.exports = promisify(getRoutes);

