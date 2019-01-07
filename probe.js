const {promisify} = require('util');

const {probe} = require('./');

/** Probe routes to find a successful route

  {
    [limit]: <Simultaneous Attempt Limit Number>
    lnd: <LND GRPC Object>
    routes: [{
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        [public_key]: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
    }]
    timeout: <Probe Timeout Milliseconds Number>
    tokens: <Tokens Number>
  }

  @returns via cbk
  {
    generic_failures: [{
      channel: <Standard Format Channel Id String>
      public_key: <Failed Edge Public Key Hex String>
    }]
    [route]: {
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        [public_key]: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
    }
    stuck: [{
      channel: <Standard Format Channel Id String>
      public_key: <Public Key Hex String>
    }]
    successes: [{
      channel: <Standard Format Channel Id String>
      public_key: <Public Key Hex String>
    }]
    temporary_failures: [{
      channel: <Standard Format Channel Id String>
      public_key: <Public Key Hex String>
    }]
  }
*/
module.exports = promisify(probe);

