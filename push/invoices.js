const {createHash} = require('crypto');

const {broadcastResponse} = require('./../async-util');
const {rowTypes} = require('./../lightning');

const intBase = 10;

/** Subscribe to invoices.

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

  const subscribeToInvoices = lnd.subscribeInvoices({});

  subscribeToInvoices.on('data', tx => {
    const isSettled = !!tx.settled;

    return broadcastResponse({
      wss,
      row: {
        description: tx.memo,
        id: createHash('sha256').update(tx.r_preimage).digest('hex'),
        is_confirmed: isSettled,
        is_outgoing: false,
        payment_secret: !isSettled ? undefined : tx.r_preimage.toString('hex'),
        tokens: parseInt(tx.value, intBase),
        type: rowTypes.channel_transaction,
      },
    });
  });

  subscribeToInvoices.on('end', () => {
    return console.log("SUB INV END");
  });

  subscribeToInvoices.on('status', status => {
    return console.log('INV STATUS', status);
  });

  subscribeToInvoices.on('error', err => {
    return console.log('INV ERROR', err);
  });

  return;
};

