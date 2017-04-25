const _ = require('lodash');
const asyncAuto = require('async/auto');

const getInvoices = require('./get_invoices');
const getPayments = require('./get_payments');
const getTransactions = require('./get_transactions');

/** Get history

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    [block_id]: <Block Hash String>
    confirmed: <Bool>
    created_at: <ISO8601 Date String>
    [destination]: <Compressed Public Key String>
    [fee]: <Satoshis Number>
    [hops]: <Route Hops Number>
    id: <String>
    [memo]: <String>
    outgoing: <Bool>
    [payment]: <Payment Request String>
    tokens: <Satoshi Number>
    type: <Type String>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return asyncAuto({
    getInvoices: (cbk) => {
      return getInvoices({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getPayments: (cbk) => {
      return getPayments({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getTransactions: (cbk) => {
      return getTransactions({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    history: ['getInvoices', 'getPayments', 'getTransactions', (res, cbk) => {
      const allTransactions = []
        .concat(res.getInvoices)
        .concat(res.getPayments)
        .concat(res.getTransactions);

      return cbk(null, _(allTransactions).sortBy(['created_at']).reverse());
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk(null, res.history);
  });
};

