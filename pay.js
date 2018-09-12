const {promisify} = require('util');

const {pay} = require('./lightning');

/** Make a payment using defined routes

  {
    id: <Payment Hash String>
    lnd: <LND GRPC API Object>
    routes: [{
      hops: [{
        channel_capacity: <Channel Capacity Tokens Number>
        channel_id: <Unique Channel Id String>
        fee: <Fee Number>
        fee_mtokens: <Fee MilliTokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward MilliTokens String>
        timeout: <Timeout Block Height Number>
      }]
    }]
  }

  @returns via Promise
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid MilliTokens String>
    hop_count: <Hop Count Number>
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <MilliTokens Paid String>
    payment_secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(pay);

