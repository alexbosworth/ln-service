const broadcastResponse = require('./broadcast_response');
const subscribeToGraph = require('./../lightning/subscribe_to_graph');

const graphEvents = ['channel_closed', 'channel_updated', 'node_updated'];
const {isArray} = Array;

/** Subscribe to channel graph updates.

  {
    lnd: <Authenticated LND gRPC API Object>
    wss: [<Web Socket Server Object>]
  }

  @throws
  <Error on Invalid Arguments>
*/
module.exports = ({lnd, log, wss}) => {
  if (!lnd) {
    throw new Error('ExpectedLndForChannelGraphSubscription');
  }

  if (!log) {
    throw new Error('ExpectedLogFunctionForChannelGraphUpdates');
  }

  if (!isArray(wss)) {
    throw new Error('ExpectedWebSocketServersForChannelGraphSubscription');
  }

  const subscription = subscribeToGraph({lnd});

  graphEvents.forEach(event => {
    return subscription.on(event, row => broadcastResponse({log, row, wss}))
  });

  subscription.on('end', () => {});
  subscription.on('error', err => log([503, 'SubscribeToGraphError', {err}]));
  subscription.on('status', ({}) => {});

  return;
};
