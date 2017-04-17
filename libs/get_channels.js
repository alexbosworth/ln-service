/** Get channels

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    id: <Channel Id String>
    is_active: <Channel Active Bool>
    local_balance: <Local Balance Satoshis Number>
    partner_public_key: <Channel Partner Public Key String>
    received: <Received Satoshis Number>
    remote_balance: <Remote Balance Satoshis Number>
    sent: <Sent Satoshis Number>
    transaction_id: <Blockchain Transaction Id>
    transaction_vout: <Blockchain Transaction Vout Number>
    transfers_count: <Channel Transfers Total Number>
    unsettled_balance: <Unsettled Balance Satoshis Number>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.listChannels({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get channels error', err]); }

    if (!res || !Array.isArray(res.channels)) {
      return cbk([500, 'Expected channels array', res]);
    }

    // FIXME: - check for valid channel data

    const channels = res.channels.map((channel) => {
      if (!!channel.pending_htlcs.length) {
        console.log("PENDING HTLCS", channel.pending_htlcs);
      }

      const [transactionId, vout] = channel.channel_point.split(":");

      return {
        id: channel.chan_id,
        is_active: channel.active,
        local_balance: parseInt(channel.local_balance),
        partner_public_key: channel.remote_pubkey,
        received: parseInt(channel.total_satoshis_received),
        remote_balance: parseInt(channel.remote_balance),
        sent: parseInt(channel.total_satoshis_sent),
        transaction_id: transactionId,
        transaction_vout: parseInt(vout),
        transfers_count: parseInt(channel.num_updates),
        unsettled_balance: parseInt(channel.unsettled_balance),
      };
    });

    return cbk(null, channels);
  });
};

