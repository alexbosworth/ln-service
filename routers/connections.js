const ExpressRouter = require('express').Router;

const getConnections = require('./../libs/get_connections');
const returnJson = require('./../libs/return_json');

/** Get a connections router

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

  router.get('/', (req, res) => {
    return getConnections({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res}));
  });

  return router;
};

