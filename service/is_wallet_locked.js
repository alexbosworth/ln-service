const {getWalletInfo} = require('./../lightning');
const localLnd = require('./local_lnd');

const lndLockedErrorCode = 'LndLocked';

/** Determine if wallet is unlocked

  {}

  @returns via cbk
  {
    is_unlocked: <Wallet Is Unlocked Bool>
  }
*/
module.exports = ({}, cbk) => {
  return getWalletInfo({lnd: localLnd({})}, err => {
    // Exit early when there is no error which indicates the wallet is unlocked
    if (!err) {
      return cbk(null, false);
    }

    const [,errorMessage] = err;

    switch (errorMessage) {
    case lndLockedErrorCode:
      return cbk(null, true);

    default:
      return cbk([503, 'FailedToDetermineWalletUnlockStatus', err]);
    }
  });
};

