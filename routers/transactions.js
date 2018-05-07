const {getTransactions} = require('./../lightning');
const {returnJson} = require('./../async-util');
const {sendToChainAddress} = require('./../lightning');
const Router = require('./router');

/** Get a transactions router.

  {
    lnd: <LND GRPC API Object>
    log: <Logging Function>
    wss: [<Websocket Server Object>]
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log, wss}) => {
  const router = Router({});

  router.get('/', ({}, res) => getTransactions({lnd}, returnJson({log, res})));

  router.post('/', ({body}, res) => {
    return sendToChainAddress({
      lnd,
      wss,
      address: body.address,
      tokens: body.tokens,
    },
    returnJson({log, res}));
  });

  return router;
};

