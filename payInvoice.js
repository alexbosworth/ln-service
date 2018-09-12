const {promisify} = require('util');

const {payInvoice} = require('./lightning');

/** Send a channel payment.

  {
    [fee]: <Maximum Additional Fee Tokens To Pay Number>
    invoice: <Bolt 11 Invoice String>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [wss]: [<Web Socket Server Object>]
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
module.exports = promisify(payInvoice);

