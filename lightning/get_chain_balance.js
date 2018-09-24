const decBase = 10;

/** Get balance on the chain.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    chain_balance: <Confirmed Chain Balance Tokens Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedLndToRetrieveChainBalance']);
  }

  return lnd.walletBalance({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'GetBalanceErr', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedChainBalanceResponse']);
    }

    if (res.confirmed_balance === undefined) {
      return cbk([503, 'ExpectedConfirmedBalance', res]);
    }

    return cbk(null, {
      chain_balance: parseInt(res.confirmed_balance, decBase),
    });
  });
};

