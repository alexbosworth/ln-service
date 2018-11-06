const {promisify} = require('util');

const {openChannel} = require('./');

/** Open a new channel.

  {
    [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
    [give_tokens]: <Tokens to Give To Partner Number> // Defaults to zero
    [is_private]: <Channel is Private Bool> // Defaults to false
    lnd: <LND GRPC API Object>
    [local_tokens]: <Local Tokens Number> // Defaults to max possible tokens
    partner_public_key: <Public Key Hex String>
    [socket]: <Peer Socket String>
  }

  @returns via Promise
  {
    transaction_id: <Funding Transaction Id String>
    transaction_vout: <Funding Transaction Output Index>
    type: <Type> // 'channel_pending'
  }
*/
module.exports = promisify(openChannel);

