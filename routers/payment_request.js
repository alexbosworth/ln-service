const ExpressRouter = require('express').Router;

const getPaymentRequest = require('./../libs/get_payment_request');
const returnJson = require('./../libs/return_json');

/** Get a payment request details router

  {
    lnd_grpc_api: <LND API>
  }

  @returns
  <Router Object>
*/
module.exports = (args) => {
  if (!args.lnd_grpc_api) {
    return (req, res) => {
      return res.status(500).json({error: 'Invalid arguments'});
    };
  }

  const router = ExpressRouter({caseSensitive: true, strict: true});

  router.get('/:payment_request', (req, res) => {
    return getPaymentRequest({
      lnd_grpc_api: args.lnd_grpc_api,
      payment_request: req.params.payment_request,
    },
    returnJson({res}));
  });

  return router;
};

