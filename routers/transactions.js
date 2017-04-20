const ExpressRouter = require('express').Router;

const getTransactions = require('./../libs/get_transactions');
const returnJson = require('./../libs/return_json');
const sendTransaction = require('./../libs/send_transaction');

/** Get a transactions router.

  {
    lnd_grpc_api: <LND API>
  }

  @returns
  <Router Object>
*/
module.exports = (args) => {
  if (!args.lnd_grpc_api) {
    return (req, res) => { return res.status(500).send(); };
  }

  const router = ExpressRouter({caseSensitive: true, strict: true});

  router.get('/', (req, res) => {
    return getTransactions({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res}));
  });

  router.post('/', (req, res) => {
    return sendTransaction({
      address: req.body.address,
      lnd_grpc_api: args.lnd_grpc_api,
      tokens: req.body.tokens,
    },
    returnJson({res}));
  });

  return router;
};

