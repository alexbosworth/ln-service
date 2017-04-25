const ExpressRouter = require('express').Router;

const createInvoice = require('./../libs/create_invoice');
const getInvoices = require('./../libs/get_invoices');
const returnJson = require('./../libs/return_json');

/** Get an invoices router.

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

  router.get('/', (req, res, next) => {
    return getInvoices({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res}));
  });

  router.post('/', (req, res, next) => {
    return createInvoice({
      lnd_grpc_api: args.lnd_grpc_api,
      memo: req.body.memo,
      tokens: req.body.tokens,
    },
    returnJson({res}));
  });

  return router;
};

