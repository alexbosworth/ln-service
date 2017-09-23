const rowTypes = require('./../config/row_types');

const intBase = 10;
const msPerSec = 1e3;

/** Get Blockchain transactions.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    [block_id]: <Block Hash String>
    confirmation_count: <Number>
    confirmed: <Bool>
    created_at: <Created ISO 8601 Date String>
    fee: <Fees Paid Satoshi Number>
    id: <Transaction Id String>
    outgoing: <Transaction Outbound Bool>
    tokens: <Satoshis Number>
    type: <Type String>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.getTransactions({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get transactions error', err]); }

    if (!res || !Array.isArray(res.transactions)) {
      return cbk([500, 'Expected transactions', res]);
    }

    const transactions = res.transactions.map((transaction) => {
      const dateTime = parseInt(transaction.time_stamp, intBase) * msPerSec;

      return {
        block_id: transaction.block_hash || null,
        confirmed: !!transaction.num_confirmations,
        confirmation_count: !transaction.num_confirmations ? 0 : 1,
        created_at: new Date(dateTime).toISOString(),
        fee: parseInt(transaction.total_fees, intBase),
        id: transaction.tx_hash,
        outgoing: (parseInt(transaction.amount, intBase) < 0),
        tokens: Math.abs(parseInt(transaction.amount, intBase)),
        type: rowTypes.chain_transaction,
      };
    });

    return cbk(null, transactions);
  });
};

