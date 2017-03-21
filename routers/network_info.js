const ExpressRouter = require('express').Router;

const getNetworkInfo = require('./../libs/get_network_info');

/** Get a purchase router

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

  router.get("/", (req, res) => {
    return getNetworkInfo({
      lnd_grpc_api: args.lnd_grpc_api,
    },
    (err, networkInfo) => {
      if (!!err) { return res.status(err[0]).json({error: err[1] || ''}); }

      return res.json(networkInfo);
    });
  });

  return router;
};

