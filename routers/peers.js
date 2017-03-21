const ExpressRouter = require('express').Router;

const getPeers = require('./../libs/get_peers');
const returnJson = require('./../libs/return_json');

/** Get a peers router

  {
    lnd_grpc_api: <LND API>
  }
*/
module.exports = (args) => {
  if (!args.lnd_grpc_api) {
    return (req, res) => {
      return res.status(500).json({error: 'Invalid arguments'});
    };
  }

  const router = ExpressRouter({caseSensitive: true, strict: true});

  router.get("/", (req, res) => {
    return getPeers({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res: res}));
  });

  return router;
};

