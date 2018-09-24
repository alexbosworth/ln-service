const {promisify} = require('util');

const {openChannel} = require('./');

/** Open a new channel.

  {
    [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
    [give_tokens]: <Tokens to Give To Partner Number>
    lnd: <LND GRPC API Object>
    [local_tokens]: <Local Tokens Number> // When not set, uses max possible
    partner_public_key: <Public Key Hex String>
  }

  @returns via Promise
  {
    transaction_id: <Funding Transaction Id String>
    transaction_vout: <Funding Transaction Output Index>
    type: <Type> // 'channel_pending'
  }
*/
module.exports = promisify(openChannel);

