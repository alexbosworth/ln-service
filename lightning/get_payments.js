const asyncAuto = require('async/auto');
const asyncMap = require('async/map');

const {returnResult} = require('./../async-util');

const transactionType = require('./conf/row_types').channel_transaction;

const intBase = 10;
const msPerSecond = 1e3;

/** Get payments made through channels.

  {
    lnd: <Object>
  }

  @returns via cbk
  {
    payments: [{
      created_at: <ISO8601 Date String>
      destination: <Compressed Public Key String>
      fee: <Tokens Number>
      hop_count: <Route Hops Number>
      id: <RHash Id String>
      is_confirmed: <Bool>
      is_outgoing: <Is Outgoing Bool>
      tokens: <Sent Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      return cbk();
    },

    // Get all payments
    listPayments: ['validate', (_, cbk) => {
      return lnd.listPayments({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetPaymentsError', err]);
        }

        if (!res || !Array.isArray(res.payments)) {
          return cbk([503, 'ExpectedPayments', res]);
        }

        return cbk(null, res.payments);
      });
    }],

    // Check and map payments
    foundPayments: ['listPayments', ({listPayments}, cbk) => {
      return asyncMap(listPayments, (payment, cbk) => {
        if (!payment) {
          return cbk([503, 'ExpectedPayment']);
        }

        if (!payment.creation_date) {
          return cbk([503, 'ExpectedCreationDate']);
        }

        if (typeof payment.fee !== 'string') {
          return cbk([503, 'ExpectedPaymentFee', payment]);
        }

        if (!Array.isArray(payment.path)) {
          return cbk([503, 'ExpectedPaymentPath']);
        }

        if (!payment.payment_hash) {
          return cbk([503, 'ExpectedPaymentHash']);
        }

        if (typeof payment.value !== 'string') {
          return cbk([503, 'ExpectedPaymentValue']);
        }

        const creationDate = parseInt(payment.creation_date, intBase);

        return cbk(null, {
          created_at: new Date(creationDate * msPerSecond).toISOString(),
          destination: payment.path[payment.path.length - [payment].length],
          fee: parseInt(payment.fee, intBase),
          hop_count: payment.path.length - [payment].length,
          id: payment.payment_hash,
          is_confirmed: true,
          is_outgoing: true,
          tokens: parseInt(payment.value, intBase),
          type: transactionType,
        });
      },
      cbk);
    }],

    // Final found payments
    payments: ['foundPayments', ({foundPayments}, cbk) => {
      return cbk(null, {payments: foundPayments});
    }],
  },
  returnResult({of: 'payments'}, cbk));
};

