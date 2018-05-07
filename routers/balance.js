const {getBalance} = require('./../service');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a balance router

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  router.get('/', ({}, res) => getBalance({lnd}, returnJson({log, res})));

  return router;
};

