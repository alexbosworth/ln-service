const Router = require('express');

const {getConnections} = require('./../service');
const {returnJson} = require('./../async-util');

/** Get a connections router

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getConnections({lnd}, returnJson({res})));

  return router;
};

