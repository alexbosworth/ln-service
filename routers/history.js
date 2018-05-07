const {getHistory} = require('./../service');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a history router

  {
    lnd: <LND API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  router.get('/', ({}, res) => getHistory({lnd}, returnJson({log, res})));

  return router;
};

