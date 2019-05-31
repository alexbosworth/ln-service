const {promisify} = require('util');

const {payViaRoutes} = require('./');

/** Make a payment via a specified route

  If no id is specified, a random id will be used

  {
    [id]: <Payment Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
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
      mtokens: <Total Millitokens To Pay String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
    [wss]: [<Web Socket Server Object>]
  }

  @returns via Promise
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid Millitokens String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Hop Channel Capacity Tokens Number>
      fee_mtokens: <Hop Forward Fee Millitokens String>
      forward_mtokens: <Hop Forwarded Millitokens String>
      timeout: <Hop CLTV Expiry Block Height Number>
    }]
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <Total Millitokens Sent String>
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Number>
    type: <Type String>
  }
*/
module.exports = promisify(payViaRoutes);
