const ExpressRouter = require('express').Router;

const returnJson = require('./../libs/return_json');
const sendPayment = require('./../libs/send_payment');

/** Get a payments router.

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

  router.post('/', (req, res, next) => {
    return sendPayment({
      lnd_grpc_api: args.lnd_grpc_api,
      payment_request: req.body.payment_request,
    },
    returnJson({res}));
  });

  return router;
};

