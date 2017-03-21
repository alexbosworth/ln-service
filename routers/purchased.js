const ExpressRouter = require('express').Router;

const lookupInvoice = require('./../libs/lookup_invoice');
const returnJson = require('./../libs/return_json');

/** Get a purchase router

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

  router.get('/:rhash', (req, res, next) => {
    return lookupInvoice({
      lnd_grpc_api: args.lnd_grpc_api,
      rhash: req.params.rhash,
    },
    returnJson({res: res}));
  });

  return router;
};

