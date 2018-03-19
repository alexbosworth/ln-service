const {broadcastResponse} = require('./../async-util');

const {rowTypes} = require('./../lightning');

const intBase = 10;

/** Subscribe to transactions.

  {
    lnd: <LND GRPC API Object>
    wss: <Web Socket Server Object>
  }
*/
module.exports = ({lnd, wss}) => {
  if (!lnd) {
    return console.log([500, 'ExpectedLnd']);
  }

  if (!wss) {
    return console.log([500, 'ExpectedWss']);
  }

  const subscribeToTransactions = lnd.subscribeTransactions({});

  subscribeToTransactions.on('data', tx => {
    return broadcastResponse({
      clients: wss.clients,
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

  subscribeToTransactions.on('status', status => {
    console.log("SUB STATUS", status);
  });

  subscribeToTransactions.on('error', err => {
    console.log("SUB TX ERROR", err);
  });

  return;
};

