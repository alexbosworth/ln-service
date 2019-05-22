const getWalletInfo = require('./get_wallet_info');

/** Get current wallet chain height

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    height: <Current Best Chain Block Height Number>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedLndToGetWalletChainHeight']);
  }

  return getWalletInfo({lnd}, (err, wallet) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, {height: wallet.current_block_height});
  });
};
