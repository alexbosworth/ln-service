const {promisify} = require('util');

const {getRoutes} = require('./');

/** Get routes a payment can travel towards a destination

  Either a destination or extended routes are required.

  {
    [destination]: <Final Send Destination Hex Encoded Public Key String>
    [fee]: <Maximum Fee Tokens Number>
    [get_channel]: <Custom Get Channel Function>
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    lnd: <Authenticated LND gRPC API Object>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [start]: <Starting Node Public Key Hex String>
    [timeout]: <Final CLTV Delta Number>
    [tokens]: <Tokens to Send Number>
  }

  @returns via Promise
  {
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Forward Edge Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }]
  }
*/
module.exports = promisify(getRoutes);
