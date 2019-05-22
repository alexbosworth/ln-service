const {promisify} = require('util');

const {createInvoice} = require('./');

/** Create a channel invoice.

  {
    [cltv_delta]: <CLTV Delta Number>
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [is_fallback_included]: <Is Fallback Address Included Bool>
    [is_fallback_nested]: <Is Fallback Address Nested Bool>
    [is_including_private_channels]: <Invoice Includes Private Channels Bool>
    lnd: <Authenticated LND gRPC API Object>
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
    id: <Payment Hash Hex String>
    request: <BOLT 11 Encoded Payment Request String>
    secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = promisify(createInvoice);
