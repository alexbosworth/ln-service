const {broadcastResponse} = require('./../async-util');
const {subscribeToGraph} = require('./../lightning');

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

  subscription.on('data', row => broadcastResponse({log, row, wss}));
  subscription.on('end', () => {});
  subscription.on('error', err => log([503, 'SubscribeToGraphError', {err}]));
  subscription.on('status', ({}) => {});

  return;
};
