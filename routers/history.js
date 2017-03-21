const ExpressRouter = require('express').Router;

const getHistory = require('./../libs/get_history');
const returnJson = require('./../libs/return_json');

/** Get a history router

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
    return getHistory({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res: res}));
  });

  return router;
};

