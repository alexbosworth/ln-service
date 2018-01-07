const expressRouter = require('express').Router;

const getCurrentRate = require('./../libs/get_bitcoinaverage_current_rate');
const returnJson = require('./../libs/return_json');

/** Get an exchange router

  {}

  @returns
  <Router Object>
*/
module.exports = (args) => {
  const router = expressRouter({caseSensitive: true, strict: true});

  router.get('/:currency_code/current_rate', (req, res) => {
    return getCurrentRate({
      currency_code: req.params.currency_code,
    }, returnJson({res}));
  });

  return router;
};

