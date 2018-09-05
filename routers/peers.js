const {addPeer} = require('./../lightning');
const {getPeers} = require('./../lightning');
const {removePeer} = require('./../lightning');
const {returnJson, returnError} = require('./../async-util');
const Router = require('./router');

/** Get a peers router

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
  }

  @returns
  <Router Object>
*/
module.exports = ({lnd, log}) => {
  const router = Router({});

  /** Get the list of connected peers
  */
  router.get('/', ({}, res) => getPeers({lnd}, returnJson({log, res})));

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
    }).then(result => {
      returnJson({log, res});
    }).catch(errorObj => {
      returnError(errorObj, log, res);
    });
  });

  /** Disconnect from a peer

    @urlParams
    {
      public_key: <Public Key Hex String>
    }
  */
  router.delete('/:public_key', ({params}, res) => {
    return removePeer({
      lnd,
      public_key: params.public_key,
    }).then(res => {
      returnJson({log, res}));
    }).catch(errorObj => {
      returnError(errorObj, log, res);
    });
  });

  return router;
};

