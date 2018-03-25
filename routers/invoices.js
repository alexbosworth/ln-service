const {Router} = require('express');

const {createInvoice} = require('./../lightning');
const {getInvoiceDetails} = require('./../service');
const {getInvoices} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get an invoices router.

  {
    lnd: <LND API Object>
    wss: [<WebSocket Server Object>]
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, wss}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getInvoices({lnd}, returnJson({res})));

  router.get('/:invoice', ({params}, res) => {
    const {invoice} = params;

    return getInvoiceDetails({invoice, lnd}, returnJson({res}));
  });

  router.post('/', ({body}, res) => {
    return createInvoice({
      lnd,
      wss,
      description: body.description,
      include_address: body.include_address,
      tokens: body.tokens,
    },
    returnJson({res}));
  });

  return router;
};

