const {Router} = require('express');

const {getBalance} = require('./../service');
const {returnJson} = require('./../async-util');

/** Get a balance router

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getBalance({lnd}, returnJson({res})));

  return router;
};

