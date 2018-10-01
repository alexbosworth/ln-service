const {promisify} = require('util');

const {getChannels} = require('./');

/** Get channels

  {
    [is_active]: <Limit Results To Only Active Channels Bool> // false
    [is_offline]: <Limit Results To Only Offline Channels Bool> // false
    [is_private]: <Limit Results To Only Private Channels Bool> // false
    [is_public]: <Limit Results To Only Public Channels Bool> // false
    lnd: {listChannels: <Function>}
  }

  @returns via Promise
  {
    channels: [{
      capacity: <Channel Token Capacity Number>
      commit_transaction_fee: <Commit Transaction Fee Number>
      commit_transaction_weight: <Commit Transaction Weight Number>
      id: <Channel Id String>
      is_active: <Channel Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      is_private: <Channel Is Private Bool>
      local_balance: <Local Balance Satoshis Number>
      partner_public_key: <Channel Partner Public Key String>
      pending_payments: [{
        id: <Payment Preimage Hash Hex String>
        is_outgoing: <Payment Is Outgoing Bool>
        timeout: <Chain Height Expiration Number>
        tokens: <Payment Tokens Number>
      }]
      received: <Received Satoshis Number>
      remote_balance: <Remote Balance Satoshis Number>
      sent: <Sent Satoshis Number>
      transaction_id: <Blockchain Transaction Id String>
      transaction_vout: <Blockchain Transaction Vout Number>
      unsettled_balance: <Unsettled Balance Satoshis Number>
    }]
  }
*/
module.exports = promisify(getChannels);

