const ExpressRouter = require('express').Router;

const getTransactionInfo = require('./../libs/get_transaction_info');
const returnJson = require('./../libs/return_json');

/** Get a transaction info router.

  {}

  @returns
  <Router Object>
*/
module.exports = (args) => {
  const router = ExpressRouter({caseSensitive: true, strict: true});

  router.get('/transaction_info/:id', (req, res) => {
    return getTransactionInfo({id: req.params.id}, returnJson({res: res}));
  });

  return router;
};

