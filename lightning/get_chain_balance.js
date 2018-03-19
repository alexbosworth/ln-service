const intBase = 10;
const smallTokenUnitsPerBigUnit = 1e8;

/** Get balance on the chain.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    chain_balance: <Chain Balance Tokens>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  return lnd.walletBalance({}, (err, res) => {
    if (!!err) {
      return cbk([503, 'GetBalanceErr', err]);
    }

    if (!res || res.confirmed_balance === undefined) {
      return cbk([503, 'ExpectedConfirmedBalance', res]);
    }

    return cbk(null, {
      chain_balance: parseInt(res.confirmed_balance, intBase),
    });
  });
};

