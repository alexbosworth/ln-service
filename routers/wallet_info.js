const ExpressRouter = require('express').Router;

const getWalletInfo = require('./../libs/get_wallet_info');
const returnJson = require('./../libs/return_json');

/** Get a wallet info router

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
    return getWalletInfo({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res: res}));
  });

  return router;
};

