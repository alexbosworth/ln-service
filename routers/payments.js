const {payInvoice} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a payments router.

  {
    lnd: <LND API Object>
    log: <Log Function>>
    wss: [<Websocket Server>]
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log, wss}) => {
  const router = Router({});

  // Send a payment
  router.post('/', ({body}, res) => {
    const {fee} = body;
    const {invoice} = body;

    return payInvoice({fee, invoice, lnd, log, wss}, returnJson({log, res}));
  });

  return router;
};

