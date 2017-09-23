const broadcastResponse = require('./../libs/broadcast_response');
const rowTypes = require('./../config/row_types');

const intBase = 10;

/** Subscribe to transactions.

  {
    lnd_grpc_api: <LND GRPC API Object>
    wss: <Web Socket Server Object>
  }
*/
module.exports = (args) => {
  if (!args.lnd_grpc_api || !args.wss) {
    return console.log([500, 'Invalid args']);
  }

  const subscribeToTransactions = args.lnd_grpc_api.subscribeTransactions({});

  subscribeToTransactions.on('data', (tx) => {
    return broadcastResponse({
      clients: args.wss.clients,
      row: {
        block_id: tx.block_hash || null,
        confirmation_count: !tx.block_hash ? 0 : 1,
        confirmed: !!tx.block_hash,
        fee: parseInt(tx.total_fees, intBase),
        id: tx.tx_hash,
        outgoing: parseInt(tx.amount, intBase) < 0,
        tokens: Math.abs(parseInt(tx.amount, intBase)),
        type: rowTypes.chain_transaction,
      },
    });
  });

  subscribeToTransactions.on('end', () => { console.log("SUB END"); });

  subscribeToTransactions.on('status', (status) => {
    console.log("SUB STATUS", status);
  });

  subscribeToTransactions.on('error', (err) => {
    console.log("SUB TX ERROR", err);
  });
};

