const ExpressRouter = require('express').Router;

const createAddress = require('./../libs/create_address');
const returnJson = require('./../libs/return_json');

/** Get an addresses router

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
    return createAddress({lnd_grpc_api: args.lnd_grpc_api}, returnJson({res}));
  });

  return router;
};

