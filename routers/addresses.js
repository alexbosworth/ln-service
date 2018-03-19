const {Router} = require('express');

const {createAddress} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get an addresses router

  {
    lnd: <LND API>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.post('/', (_, res) => createAddress({lnd}, returnJson({res})));

  return router;
};

