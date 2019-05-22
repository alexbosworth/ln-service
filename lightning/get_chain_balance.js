const decBase = 10;

/** Get balance on the chain.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    chain_balance: <Confirmed Chain Balance Tokens Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.default || !lnd.default.walletBalance) {
    return cbk([400, 'ExpectedLndToRetrieveChainBalance']);
  }

  return lnd.default.walletBalance({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorWhenGettingChainBalance', {err}]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResponseForChainBalanceRequest']);
    }

    if (res.confirmed_balance === undefined) {
      return cbk([503, 'ExpectedConfirmedBalanceInChainBalanceResponse']);
    }

    return cbk(null, {
      chain_balance: parseInt(res.confirmed_balance, decBase),
    });
  });
};
