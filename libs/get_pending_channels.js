/** Get pending channels.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
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
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.pendingChannels({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get pending channels error', err]); }

    if (!res || !Array.isArray(res.pending_channels)) {
      return cbk([500, 'Expected pending channels', res]);
    }

    const channels = res.pending_channels.map((channel) => {
      const tx = channel.closing_txid || channel.channel_point;

      const [transactionId, vout] = tx.split(':');

      return {
        is_active: false,
        is_closing: !!channel.closing_txid,
        is_opening: channel.status === 'OPENING',
        local_balance: parseInt(channel.local_balance),
        partner_public_key: channel.identity_key,
        received: 0,
        remote_balance: parseInt(channel.remote_balance),
        sent: 0,
        transaction_id: transactionId,
        transaction_vout: parseInt(vout),
        transfers_count: 0,
      };
    });

    return cbk(null, channels);
  });
};

