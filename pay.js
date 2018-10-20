const {promisify} = require('util');

const {pay} = require('./');

/** Make a payment using defined routes

  {
    [fee]: <Maximum Additional Fee Tokens To Pay Number>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [path]: {
      id: <Payment Hash Hex String>
      routes: [{
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel_capacity: <Channel Capacity Tokens Number>
          channel_id: <Unique Channel Id String>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }]
    }
    [request]: <BOLT 11 Payment Request String>
    [tokens]: <Total Tokens To Pay Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via Promise
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid Millitokens String>
    hops: [{
      channel_capacity: <Hop Channel Capacity Tokens Number>
      channel_id: <Hop Channel Id String>
      fee_mtokens: <Hop Forward Fee Millitokens String>
      forward_mtokens: <Hop Forwarded Millitokens String>
      timeout: <Hop CLTV Expiry Block Height Number>
    }]
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <Millitokens Paid String>
    secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(pay);

