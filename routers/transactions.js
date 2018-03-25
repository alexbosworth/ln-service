const {Router} = require('express');

const {getTransactions} = require('./../lightning');
const {returnJson} = require('./../async-util');
const {sendToChainAddress} = require('./../lightning');

/** Get a transactions router.

  {
    lnd: <LND GRPC API Object>
    wss: [<Websocket Server Object>]
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, wss}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getTransactions({lnd}, returnJson({res})));

  router.post('/', ({body}, res) => {
    const {address, tokens} = body;

    return sendToChainAddress({address, lnd, tokens, wss}, returnJson({res}));
  });

  return router;
};

