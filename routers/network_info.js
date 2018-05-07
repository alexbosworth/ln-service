const {getNetworkGraph} = require('./../lightning');
const {getNetworkInfo} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a network info router.

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  router.get('/graph', ({}, res) => {
    return getNetworkGraph({lnd}, returnJson({log, res}));
  });

  router.get('/', ({}, res) => getNetworkInfo({lnd}, returnJson({log, res})));

  return router;
};

