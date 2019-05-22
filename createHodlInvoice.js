const {promisify} = require('util');

const {createHodlInvoice} = require('./');

/** Create hodl invoice. This invoice will not settle automatically when an
    HTLC arrives. It must be settled separately with a preimage.

  {
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    id: <Payment Hash Hex String>
    [internal_description]: <Internal Description String>
    [is_fallback_included]: <Is Fallback Address Included Bool>
    [is_fallback_nested]: <Is Fallback Address Nested Bool>
    [is_including_private_channels]: <Invoice Includes Private Channels Bool>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
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
module.exports = promisify(createHodlInvoice);
