const {promisify} = require('util');

const {getChannels} = require('./');

/** Get channels

  Note: is_partner_initiated will be undefined if it is unknown or true.

  {
    [is_active]: <Limit Results To Only Active Channels Bool> // false
    [is_offline]: <Limit Results To Only Offline Channels Bool> // false
    [is_private]: <Limit Results To Only Private Channels Bool> // false
    [is_public]: <Limit Results To Only Public Channels Bool> // false
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    channels: [{
      capacity: <Channel Token Capacity Number>
      commit_transaction_fee: <Commit Transaction Fee Number>
      commit_transaction_weight: <Commit Transaction Weight Number>
      id: <Standard Format Channel Id String>
      is_active: <Channel Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      is_partner_initiated: <Channel Partner Opened Channel>
      is_private: <Channel Is Private Bool>
      local_balance: <Local Balance Tokens Number>
      partner_public_key: <Channel Partner Public Key String>
      pending_payments: [{
        id: <Payment Preimage Hash Hex String>
        is_outgoing: <Payment Is Outgoing Bool>
        timeout: <Chain Height Expiration Number>
        tokens: <Payment Tokens Number>
      }]
      received: <Received Tokens Number>
      remote_balance: <Remote Balance Tokens Number>
      sent: <Sent Tokens Number>
      transaction_id: <Blockchain Transaction Id String>
      transaction_vout: <Blockchain Transaction Vout Number>
      unsettled_balance: <Unsettled Balance Tokens Number>
    }]
  }
*/
module.exports = promisify(getChannels);
