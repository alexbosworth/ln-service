const {Router} = require('express');

const {returnJson} = require('./../async-util');
const {signMessage} = require('./../lightning');
const {verifyMessage} = require('./../lightning');

/** Get a crypto router

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.post('/sign', ({body}, res) => {
    return signMessage({lnd, message: body.message}, returnJson({res}));
  });

  router.post('/verify', ({body}, res) => {
    const {message, signature} = body;

    return verifyMessage({lnd, message, signature}, returnJson({res}));
  });

  return router;
};

