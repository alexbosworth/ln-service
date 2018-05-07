const {getInvoice} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

/** Get a purchase router

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  // Lookup an invoice by id
  router.get('/:id', ({params}, res) => {
    return getInvoice({lnd, id: params.id}, returnJson({log, res}));
  });

  return router;
};

