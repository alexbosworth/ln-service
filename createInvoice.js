const {promisify} = require('util');

const {createInvoice} = require('./');

/** Create a channel invoice.

  {
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [internal_description]: <Internal Description String>
    [is_fallback_included]: <Is Fallback Address Included Bool>
    [is_fallback_nested]: <Is Fallback Address Nested Bool>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
    [secret]: <Payment Secret Hex String>
    [tokens]: <Tokens Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via Promise
  {
    [chain_address]: <Backup Address String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    id: <Payment Request Id String>
    request: <BOLT 11 Encoded Payment Request String>
    secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(createInvoice);

