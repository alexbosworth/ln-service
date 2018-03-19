const {Router} = require('express');

const {getCurrentRate} = require('./../service');
const {returnJson} = require('./../async-util');

/** Get an exchange router

  {}

  @returns
  <Router Object>
*/
module.exports = (args) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/:currency_code/current_rate', ({params}, res) => {
    return getCurrentRate({
      currency_code: params.currency_code,
    },
    returnJson({res}));
  });

  return router;
};

