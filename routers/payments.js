const {Router} = require('express');

const {payInvoice} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get a payments router.

  {
    lnd: <LND API Object>
    wss: [<Websocket Server>]
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, wss}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.post('/', ({body}, res) => {
    return payInvoice({lnd, wss, invoice: body.invoice}, returnJson({res}));
  });

  return router;
};

