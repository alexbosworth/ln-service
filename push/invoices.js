const broadcastResponse = require('./../libs/broadcast_response');
const rowTypes = require('./../config/row_types');

/** Subscribe to invoices.

  {
    lnd_grpc_api: <LND GRPC API Object>
    wss: <Web Socket Server Object>
  }
*/
module.exports = (args) => {
  if (!args.lnd_grpc_api || !args.wss) {
    return console.log([500, 'Invalid args']);
  }

  const subscribeToInvoices = args.lnd_grpc_api.subscribeInvoices({});

  subscribeToInvoices.on('data', (tx) => {
    return broadcastResponse({
      clients: args.wss.clients,
      row: {
        confirmed: tx.settled,
        id: crypto.createHash('sha256').update(tx.r_preimage).digest('hex'),
        memo: tx.memo,
        outgoing: false,
        tokens: parseInt(tx.value),
        type: rowTypes.channel_transaction,
      },
    });
  });

  subscribeToInvoices.on('end', () => { console.log("SUB INV END"); });

  subscribeToInvoices.on('status', (status) => {
    console.log('INV STATUS', status);
  });

  subscribeToInvoices.on('error', (err) => { console.log('INV ERROR', err); });
};

