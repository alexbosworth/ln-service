const {promisify} = require('util');

const {probeForRoute} = require('./');

/** Probe to find a successful route

  Requires router RPC lnd

  {
    destination: <Destination Public Key Hex String>
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [timeout_height]: <Final CLTV Delta Number>
    tokens: <Tokens Number>
  }

  @returns via Promise
  {
    [route]: {
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
    }
  }
*/
module.exports = promisify(probeForRoute);
