const ExpressRouter = require('express').Router;

const libs = './../libs/';

const returnJson = require(`${libs}return_json`);
const signMessage = require(`${libs}sign_message`);
const verifyMessage = require(`${libs}verify_message`);

/** Get a crypto router

  {
    lnd_grpc_api: <LND API>
  }

  @returns
  <Router Object>
*/
module.exports = (args) => {
  if (!args.lnd_grpc_api) {
    return (req, res) => res.status(500).send();
  }

  const router = ExpressRouter({caseSensitive: true, strict: true});

  router.post('/sign', (req, res) => {
    return signMessage({
      lnd_grpc_api: args.lnd_grpc_api,
      message: req.body.message,
    },
    returnJson({res}));
  });

  router.post('/verify', (req, res) => {
    return verifyMessage({
      lnd_grpc_api: args.lnd_grpc_api,
      message: req.body.message,
      signature: req.body.signature,
    },
    returnJson({res}));
  });

  return router;
};

