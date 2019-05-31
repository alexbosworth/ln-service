const {promisify} = require('util');

const {pay} = require('./');

/** Make a payment

  Either a payment path or a BOLT 11 payment request is required

  For paying to private destinations along set paths, a public key in the route
  hops is required to form the route.

  {
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [max_fee]: <Maximum Additional Fee Tokens To Pay Number>
    [outgoing_channel]: <Pay Through Outbound Standard Channel Id String>
    [path]: {
      id: <Payment Hash Hex String>
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
      }]
    }
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [request]: <BOLT 11 Payment Request String>
    [timeout_height]: <Max CLTV Timeout Number>
    [tokens]: <Total Tokens To Pay to Payment Request Number>
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
module.exports = promisify(pay);
