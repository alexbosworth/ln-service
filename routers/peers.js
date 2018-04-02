const {Router} = require('express');

const {addPeer} = require('./../lightning');
const {disconnectPeer} = require('./../lightning');
const {getPeers} = require('./../lightning');
const {returnJson} = require('./../async-util');

/** Get a peers router

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd}) => {
  const router = Router({caseSensitive: true, strict: true});

  router.get('/', (_, res) => getPeers({lnd}, returnJson({res})));

  router.post('/', ({body}, res) => {
    return addPeer({
      lnd,
      host: body.host,
      public_key: body.public_key,
    },
    returnJson({res}));
  });

  // Disconnect from a peer
  router.delete('/:public_key', ({params}, res) => {
    return disconnectPeer({lnd, public_key: params.public_key}, returnJson({res}));
  });

  return router;
};

