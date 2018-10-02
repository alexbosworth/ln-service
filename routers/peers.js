const {addPeer} = require('./../lightning');
const {getPeers} = require('./../lightning');
const {removePeer} = require('./../lightning');
const {returnJson} = require('./../async-util');
const Router = require('./router');

const defaultLightningPort = 9735;

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
      [port]: <Port Number>
      public_key: <Public Key Hex String>
    }
  */
  router.post('/', ({body}, res) => {
    const pubKey = body.public_key;
    const socket = `${body.host}:${body.port || defaultLightningPort}`;

    return addPeer({lnd, socket, public_key: pubKey}, returnJson({log, res}));
  });

  /** Disconnect from a peer

    @urlParams
    {
      public_key: <Public Key Hex String>
    }
  */
  router.delete('/:public_key', ({params}, res) => {
    const pubKey = params.public_key;

    return removePeer({lnd, public_key: pubKey}, returnJson({log, res}));
  });

  return router;
};

