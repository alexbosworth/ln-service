const {broadcastResponse} = require('./../push');
const {subscribeToInvoices} = require('./../lightning');

const {isArray} = Array;

/** Subscribe to invoices.

  {
    lnd: <Authenticated LND gRPC API Object>
    log: <Log Function>
    wss: [<Web Socket Server Object>]
  }

  @throws
  <Error> on invalid arguments
*/
module.exports = ({lnd, log, wss}) => {
  if (!lnd) {
    throw new Error('ExpectedLndObjectToSubscribeToInvoices');
  }

  if (!log) {
    throw new Error('ExpectedLogFunctionWhenSubscribingToInvoices');
  }

  if (!isArray(wss)) {
    throw new Error('ExpectedWebSocketServersToForwardInvoicesTo');
  }

  const subscription = subscribeToInvoices({lnd});

  subscription.on('data', row => broadcastResponse({log, row, wss}));
  subscription.on('end', () => {});
  subscription.on('error', err => log([503, 'SubscribeInvoicesErr', {err}]));
  subscription.on('status', ({}) => {});

  return;
};
