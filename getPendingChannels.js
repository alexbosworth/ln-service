const {promisify} = require('util');

const {getPendingChannels} = require('./');

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    pending_channels: [{
      [close_transaction_id]: <Channel Closing Transaction Id String>
      is_active: <Channel Is Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      local_balance: <Channel Local Tokens Balance Number>
      partner_public_key: <Channel Peer Public Key String>
      [pending_balance]: <Tokens Pending Recovery Number>
      [pending_payments]: [{
        is_incoming: <Payment Is Incoming Bool>
        timelock_height: <Payment Timelocked Until Height Number>
        tokens: <Payment Tokens Number>
        transaction_id: <Payment Transaction Id String>
        transaction_vout: <Payment Transaction Vout Number>
      }]
      received: <Tokens Received Number>
      [recovered_tokens]: <Tokens Recovered From Close Number>
      remote_balance: <Remote Tokens Balance Number>
      sent: <Send Tokens Number>
      [timelock_expiration]: <Pending Tokens Block Height Timelock Number>
      [transaction_fee]: <Funding Transaction Fee Tokens Number>
      transaction_id: <Channel Funding Transaction Id String>
      transaction_vout: <Channel Funding Transaction Vout Number>
      [transaction_weight]: <Funding Transaction Weight Number>
      type: <Row Type String>
    }]
  }
*/
module.exports = promisify(getPendingChannels);
