const {pay} = require('./../lightning');
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

  /** Send a payment

    {
      [fee]: <Maximum Routing Fee To Pay Number>
      request: <BOLT 11 Payment Request String>
    }
  */
  router.post('/', ({body}, res) => {
    const {fee} = body;
    const {request} = body;

    return pay({fee, lnd, log, request, wss}, returnJson({log, res}));
  });

  return router;
};

