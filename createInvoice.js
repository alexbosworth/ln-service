const {promisify} = require('util');

const {createInvoice} = require('./lightning');

/** Create a channel invoice.

  {
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [include_address]: <Return Backup Chain Address Bool>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
    [payment_secret]: <Payment Secret Hex String>
    tokens: <Tokens Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via Promise
  {
    [chain_address]: <Backup Address String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    id: <Payment Request Id String>
    invoice: <Hex Encoded Invoice String>
    payment_secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(createInvoice);

