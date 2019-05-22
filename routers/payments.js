const {pay} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a payments router.

  {
    lnd: <Authenticated LND gRPC API Object>
    log: <Log Function>>
    wss: [<Websocket Server Object>]
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

    return pay({lnd, log, request, wss, max_fee: fee}, returnJson({log, res}));
  });

  return router;
};
