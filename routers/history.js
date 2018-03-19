const {Router} = require('express');

const {getHistory} = require('./../service');
const {returnJson} = require('./../async-util');

/** Get a history router

  {
    lnd: <LND API>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getHistory({lnd}, returnJson({res})));

  return router;
};

