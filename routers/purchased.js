const {Router} = require('express');

const {getInvoice} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get a purchase router

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/:id', ({params}, res) => {
    return getInvoice({id: params.id, lnd}, returnJson({res}));
  });

  return router;
};

