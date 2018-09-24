const decBase = 10;
const emptyTxId = '0000000000000000000000000000000000000000000000000000000000000000';
const outpointSeparator = ':';

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

  @returns via cbk
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
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.closedChannels) {
    return cbk([400, 'ExpectedLndApiForGetClosedChannelsRequest'])
  }

  args.lnd.closedChannels({
    breach: args.is_breach_close || undefined,
    cooperative: args.is_cooperative_close || undefined,
    funding_canceled: args.is_breach_close || undefined,
    local_force: args.is_local_force_close || undefined,
    remote_force: args.is_remote_force_close || undefined,
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'FailedToRetrieveClosedChannels', err]);
    }

    if (!Array.isArray(res.channels)) {
      return cbk([503, 'ExpectedChannels']);
    }

    try {
      const channels = res.channels.map(n => {
        if (!n.capacity) {
          throw new Error('ExpectedCloseChannelCapacity');
        }

        if (!n.chan_id) {
          throw new Error('ExpectedChannelIdOfClosedChannel');
        }

        if (!n.channel_point) {
          throw new Error('ExpectedCloseChannelOutpoint');
        }

        if (n.close_height === undefined) {
          throw new Error('ExpectedChannelCloseHeight');
        }

        if (!n.closing_tx_hash) {
          throw new Error('ExpectedClosingTransactionId');
        }

        if (!n.remote_pubkey) {
          throw new Error('ExpectedCloseRemotePublicKey');
        }

        if (!n.settled_balance) {
          throw new Error('ExpectedFinalSettledBalance');
        }

        if (!n.time_locked_balance) {
          throw new Error('ExpectedFinalTimeLockedBalanceForClosedChannel');
        }

        const [txId, vout] = n.channel_point.split(outpointSeparator);

        const hasCloseTx = n.closing_tx_hash !== emptyTxId;

        return {
          capacity: parseInt(n.capacity, decBase),
          close_confirm_height: !!n.close_height ? n.close_height : undefined,
          close_transaction_id: hasCloseTx ? n.closing_tx_hash : undefined,
          final_local_balance: parseInt(n.settled_balance, decBase),
          final_time_locked_balance: parseInt(n.time_locked_balance, decBase),
          id: n.chan_id !== '0' ? n.chan_id : undefined,
          is_breach_close: n.close_type === 'BREACH_CLOSE',
          is_cooperative_close: n.close_type === 'COOPERATIVE_CLOSE',
          is_funding_cancel: n.close_type === 'FUNDING_CANCELED',
          is_local_force_close: n.close_type === 'LOCAL_FORCE_CLOSE',
          is_remote_force_close: n.close_type === 'REMOTE_FORCE_CLOSE',
          partner_public_key: n.remote_pubkey,
          transaction_id: txId,
          transaction_vout: parseInt(vout, decBase),
        };
      });

      return cbk(null, {channels});
    } catch (err) {
      return cbk([503, 'UnexpectedClosedChannelResponse', err]);
    }
  });
};

