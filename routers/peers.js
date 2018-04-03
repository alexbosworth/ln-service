const {Router} = require('express');

const {addPeer} = require('./../lightning');
const {getPeers} = require('./../lightning');
const {removePeer} = require('./../lightning');
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

  /** Get the list of connected peers
  */
  router.get('/', ({}, res) => getPeers({lnd}, returnJson({res})));

  /** Add a new peer

    @bodyJson
    {
      host: <Host Network Address String>
      public_key: <Public Key Hex String>
    }
  */
  router.post('/', ({body}, res) => {
    return addPeer({
      lnd,
      host: body.host,
      public_key: body.public_key,
    },
    returnJson({res}));
  });

  /** Disconnect from a peer

    @urlParams
    {
      public_key: <Public Key Hex String>
    }
  */
  router.delete('/:public_key', ({params}, res) => {
    return removePeer({lnd, public_key: params.public_key}, returnJson({res}));
  });

  return router;
};

