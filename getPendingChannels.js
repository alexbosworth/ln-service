const {promisify} = require('util');

const {getPendingChannels} = require('./');

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    pending_channels: [{
      id: <Channel Id String>
      is_active: <Channel Active Bool>
      is_closing: <Channel Closing Bool>
      is_opening: <Channel Opening Bool>
      local_balance: <Local Balance Satoshis Number>
      partner_public_key: <Channel Partner Public Key String>
      received: <Received Satoshis Number>
      remote_balance: <Remote Balance Satoshis Number>
      sent: <Sent Satoshis Number>
      transaction_id: <Blockchain Transaction Id>
      transaction_vout: <Blockchain Transaction Vout Number>
      transfers_count: <Channel Transfers Total Number>
    }]
  }
*/
module.exports = promisify(getPendingChannels);

