const ExpressRouter = require('express').Router;

const closeChannel = require('./../libs/close_channel');
const getChannels = require('./../libs/get_channels');
const openChannel = require('./../libs/open_channel');
const returnJson = require('./../libs/return_json');

/** Get a channels router

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

  router.delete('/:id', (req, res, next) => {
    return closeChannel({
      id: req.params.id,
      lnd_grpc_api: args.lnd_grpc_api,
    },
    returnJson({res}));
  });

  router.get('/', (req, res, next) => {
    return getChannels({lnd_grpc_api: args.lnd_grpc_api}, returnJson({res}));
  });

  router.post('/', (req, res, next) => {
    return openChannel({
      lnd_grpc_api: args.lnd_grpc_api,
      partner_public_key: req.body.partner_public_key,
    },
    returnJson({res}));
  });

  return router;
};

