const {subscribeToTransactions} = require('./../lightning');

const {broadcastResponse} = require('./../async-util');

/** Subscribe to transactions.

  {
    lnd: <LND GRPC API Object>
    wss: [<Web Socket Server Object>]
  }
*/
module.exports = ({lnd, wss}) => {
  if (!lnd) {
    return console.log([500, 'ExpectedLnd']);
  }

  if (!Array.isArray(wss)) {
    return console.log([500, 'ExpectedWss']);
  }

  const subscription = subscribeToTransactions({lnd});

  subscription.on('data', row => broadcastResponse({wss, row}));

  subscription.on('end', () => {});

  subscription.on('status', status => {});

  subscription.on('error', err => console.error('[SUBTX]', err));

  return;
};

