const decBase = 10;

/** Get balance across channels.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    channel_balance: <Channels Balance Tokens Number>
    pending_balance: <Pending Channels Balance Tokens Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.default || !lnd.default.channelBalance) {
    return cbk([500, 'ExpectedLndApiForChannelBalanceQuery']);
  }

  return lnd.default.channelBalance({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedGetChannelBalanceError', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedGetChannelBalanceResponse']);
    }

    if (res.balance === undefined) {
      return cbk([503, 'ExpectedChannelBalance']);
    }

    if (res.pending_open_balance === undefined) {
      return cbk([503, 'ExpectedPendingOpenBalance']);
    }

    return cbk(null, {
      channel_balance: parseInt(res.balance, decBase),
      pending_balance: parseInt(res.pending_open_balance, decBase),
    });
  });
};
