const {createInvoice} = require('./../lightning');
const {getInvoiceDetails} = require('./../service');
const {getInvoices} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get an invoices router.

  {
    lnd: <LND API Object>
    log: <Log Function>
    wss: [<WebSocket Server Object>]
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log, wss}) => {
  const router = Router({});

  router.get('/', ({}, res) => getInvoices({lnd}, returnJson({log, res})));

  router.get('/:request', ({params}, res) => {
    const {request} = params;

    return getInvoiceDetails({lnd, request}, returnJson({log, res}));
  });

  router.post('/', ({body}, res) => {
    return createInvoice({
      lnd,
      log,
      wss,
      description: body.description,
      expires_at: body.expires_at,
      is_fallback_included: body.is_fallback_included,
      tokens: body.tokens,
    },
    returnJson({log, res}));
  });

  return router;
};

