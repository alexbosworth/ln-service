const {subscribeToTransactions} = require('./../lightning');

const {broadcastResponse} = require('./../async-util');

/** Subscribe to transactions.

  {
    lnd: <LND GRPC API Object>
    wss: [<Web Socket Server Object>]
  }

  @throws
  <Error on Invalid Arguments>
*/
module.exports = ({lnd, log, wss}) => {
  if (!lnd) {
    throw new Error('ExpectedLnd');
  }

  if (!log) {
    throw new Error('ExpectedLogFunction');
  }

  if (!Array.isArray(wss)) {
    throw new Error('ExpectedWebSocketServers');
  }

  const subscription = subscribeToTransactions({lnd});

  subscription.on('data', row => broadcastResponse({log, row, wss}));
  subscription.on('end', () => {});
  subscription.on('error', err => log([503, 'SubscribeTransactionsErr', err]));
  subscription.on('status', ({}) => {});

  return;
};

