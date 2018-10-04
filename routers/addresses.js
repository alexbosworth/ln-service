const {createChainAddress} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

const defaultFormat = 'np2wpkh';

/** Get an addresses router

  {
    lnd: <LND API>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  // Add an address
  router.post('/', ({body}, res) => {
    const format = body.format || defaultFormat;
    return createChainAddress({lnd, format}, returnJson({log, res}));
  });

  return router;
};

