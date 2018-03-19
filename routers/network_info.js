const {Router} = require('express');

const {getNetworkGraph} = require('./../lightning');
const {getNetworkInfo} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get a network info router.

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/graph', (_, res) => getNetworkGraph({lnd}, returnJson({res})));

  router.get('/', (_, res) => getNetworkInfo({lnd}, returnJson({res})));

  return router;
};

