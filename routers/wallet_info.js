const {getWalletInfo} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a wallet info router

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  // Get overall wallet info
  router.get('/', ({}, res) => getWalletInfo({lnd}, returnJson({log, res})));

  return router;
};

