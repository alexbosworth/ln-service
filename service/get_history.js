const asyncAuto = require('async/auto');
const {sortBy} = require('lodash');

const getInvoices = require('./../getInvoices');
const getPayments = require('./../getPayments');
const getChainTransactions = require('./../getChainTransactions');
const {returnResult} = require('./../async-util');

/** Get history: a combination of chain transactions, invoices and payments.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    history: [{
      [block_id]: <Block Hash String>
      chain_address: <Fallback Chain Address String>
      [confirmation_count]: <Confirmation Count Number>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      [description]: <Description String>
      [description_hash]: <Description Hash Hex String>
      [destination]: <Compressed Public Key String>
      [expires_at]: <ISO 8601 Date String>
      fee: <Tokens Number>
      [hop_count]: <Route Hops Number>
      id: <Id String>
      [is_confirmed]: <Invoice is Confirmed Bool>
      [is_outgoing]: <Invoice is Outgoing Bool>
      request: <BOLT 11 Payment Request String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
}
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Get incoming invoices
    getInvoices: async cbk => getInvoices({lnd}),

    // Get outgoing payments
    getPayments: async cbk => getPayments({lnd}),

    // Get chain transactions
    getTransactions: async cbk => getChainTransactions({lnd}),

    // Combined history
    history: ['getInvoices', 'getPayments', 'getTransactions', (res, cbk) => {
      const allTransactions = []
        .concat(res.getInvoices.invoices)
        .concat(res.getPayments.payments)
        .concat(res.getTransactions.transactions);

      return cbk(null, {
        history: sortBy(allTransactions, ['created_at']).reverse(),
      });
    }],
  },
  returnResult({of: 'history'}, cbk));
};

