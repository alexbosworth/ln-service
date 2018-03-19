const {Router} = require('express');

const {getWalletInfo} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get a wallet info router

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getWalletInfo({lnd}, returnJson({res})));

  return router;
};

