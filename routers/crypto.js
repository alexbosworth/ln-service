const {returnJson} = require('./../async-util');
const {signMessage} = require('./../lightning');
const {verifyMessage} = require('./../lightning');
const Router = require('./router');

/** Get a crypto router

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  router.post('/sign', ({body}, res) => {
    return signMessage({lnd, message: body.message}, returnJson({log, res}));
  });

  router.post('/verify', ({body}, res) => {
    const {message, signature} = body;

    return verifyMessage({lnd, message, signature}, returnJson({log, res}));
  });

  return router;
};

