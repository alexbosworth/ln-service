const {promisify} = require('util');

const {getClosedChannels} = require('./');

/** Get closed out channels

  Multiple close type flags are supported.

  {
    [is_breach_close]: <Bool>
    [is_cooperative_close]: <Bool>
    [is_funding_cancel]: <Bool>
    [is_local_force_close]: <Bool>
    [is_remote_force_close]: <Bool>
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    channels: [{
      capacity: <Closed Channel Capacity Tokens Number>
      [close_confirm_height]: <Channel Close Confirmation Height Number>
      [close_transaction_id]: <Closing Transaction Id Hex String>
      final_local_balance: <Channel Close Final Local Balance Tokens Number>
      final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
      [id]: <Closed Channel Id String>
      is_breach_close: <Is Breach Close Bool>
      is_cooperative_close: <Is Cooperative Close Bool>
      is_funding_cancel: <Is Funding Cancelled Close Bool>
      is_local_force_close: <Is Local Force Close Bool>
      is_remote_force_close: <Is Remote Force close Bool>
      partner_public_key: <Partner Public Key Hex String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Channel Funding Output Index Number>
    }]
  }
*/
module.exports = promisify(getClosedChannels);

