const {broadcastResponse} = require('./../async-util');
const {subscribeToGraph} = require('./../lightning');

/** Subscribe to channel graph updates.

  {
    lnd: <LND GRPC API Object>
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

  if (!Array.isArray(wss)) {
    throw new Error('ExpectedWebSocketServersForChannelGraphSubscription');
  }

  const subscription = subscribeToGraph({lnd});

  subscription.on('data', row => broadcastResponse({log, row, wss}));
  subscription.on('end', () => {});
  subscription.on('error', err => log([503, 'SubscribeToGraphError', err]));
  subscription.on('status', ({}) => {});

  return;
};

