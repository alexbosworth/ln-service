const intBase = 10;

/** Get balance across channels.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    channel_balance: <Channels Balance Tokens>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLndApi']);
  }

  return lnd.channelBalance({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'ChannelBalanceErr', err]);
    }

    if (!res || res.balance === undefined) {
      return cbk([503, 'ExpectedBalance', res]);
    }

    return cbk(null, {channel_balance: parseInt(res.balance, intBase)});
  });
};

