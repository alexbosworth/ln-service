const {subscribeToInvoices} = require('./../lightning');

const {broadcastResponse} = require('./../async-util');

/** Subscribe to invoices.

  {
    lnd: <LND GRPC API Object>
    wss: [<Web Socket Server Object>]
  }
*/
module.exports = ({lnd, wss}) => {
  if (!lnd) {
    return console.log([400, 'ExpectedLnd']);
  }

  if (!Array.isArray(wss)) {
    return console.log([400, 'ExpectedWss']);
  }

  const subscription = subscribeToInvoices({lnd});

  subscription.on('data', row => broadcastResponse({wss, row}));

  subscription.on('end', () => {});

  subscription.on('status', status => {});

  subscription.on('error', err => console.error('[SUBINVOICES]', err));

  return;
};

