const {broadcastResponse} = require('./../async-util');
const {subscribeToInvoices} = require('./../lightning');

/** Subscribe to invoices.

  {
    lnd: <LND GRPC API Object>
    log: <Log Function>
    wss: [<Web Socket Server Object>]
  }

  @throws
  <Error> on invalid arguments
*/
module.exports = ({lnd, log, wss}) => {
  if (!lnd) {
    throw new Error('ExpectedLndObject');
  }

  if (!log) {
    throw new Error('ExpectedLogFunction');
  }

  if (!Array.isArray(wss)) {
    throw new Error('ExpectedWebSocketServers');
  }

  const subscription = subscribeToInvoices({lnd});

  subscription.on('data', row => broadcastResponse({log, row, wss}));
  subscription.on('end', () => {});
  subscription.on('error', err => log([503, 'InvoicesSubscriptionErr', err]));
  subscription.on('status', ({}) => {});

  return;
};

