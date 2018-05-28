const {getConnections} = require('./../service');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a connections router

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  // Get connections
  router.get('/', ({}, res) => getConnections({lnd}, returnJson({log, res})));

  return router;
};

