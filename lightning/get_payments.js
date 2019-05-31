const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {returnResult} = require('asyncjs-util');

const transactionType = require('./conf/row_types').channel_transaction;

const decBase = 10;
const {isArray} = Array;
const msPerSecond = 1e3;

/** Get payments made through channels.

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    payments: [{
      created_at: <ISO8601 Date String>
      destination: <Compressed Public Key String>
      fee: <Tokens Number>
      hops: [<Node Hop Public Key Hex String>]
      id: <RHash Id String>
      is_confirmed: <Bool>
      is_outgoing: <Is Outgoing Bool>
      mtokens: <Millitokens Paid String>
      secret: <Payment Preimage Hex String>
      tokens: <Sent Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd || !lnd.default || !lnd.default.listPayments) {
        return cbk([400, 'ExpectedLndForGetPaymentsRequest']);
      }

      return cbk();
    },

    // Get all payments
    listPayments: ['validate', ({}, cbk) => {
      return lnd.default.listPayments({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'UnexpectedGetPaymentsError', {err}]);
        }

        if (!res || !isArray(res.payments)) {
          return cbk([503, 'ExpectedPaymentsInListPaymentsResponse']);
        }

        return cbk(null, res.payments);
      });
    }],

    // Check and map payments
    foundPayments: ['listPayments', ({listPayments}, cbk) => {
      return asyncMap(listPayments, (payment, cbk) => {
        if (!payment) {
          return cbk([503, 'ExpectedPaymentInListPaymentsResponse']);
        }

        if (!payment.creation_date) {
          return cbk([503, 'ExpectedCreationDateInListPaymentsResponse']);
        }

        if (typeof payment.fee !== 'string') {
          return cbk([503, 'ExpectedPaymentFeeInListPaymentsResponse']);
        }

        if (!isArray(payment.path) || !payment.path.length) {
          return cbk([503, 'ExpectedPaymentPathInListPaymentsResponse']);
        }

        try {
          payment.path.forEach(key => {
            if (!key) {
              throw new Error('ExpectedPathHopKeyInListPaymentsResponse');
            }

            return;
          });
        } catch (err) {
          return cbk([503, err.message]);
        }

        if (!payment.payment_hash) {
          return cbk([503, 'ExpectedPaymentHashInListPaymentsResponse']);
        }

        if (!payment.payment_preimage) {
          return cbk([503, 'ExpectedPaymentPreimageInListPaymentsResponse']);
        }

        if (typeof payment.value_sat !== 'string') {
          return cbk([503, 'ExpectedPaymentValueInListPaymentsResponse']);
        }

        const creationDate = parseInt(payment.creation_date, decBase);
        const [destination, ...hops] = payment.path.reverse();

        return cbk(null, {
          destination,
          created_at: new Date(creationDate * msPerSecond).toISOString(),
          fee: parseInt(payment.fee, decBase),
          hops: hops.reverse(),
          id: payment.payment_hash,
          is_confirmed: true,
          is_outgoing: true,
          mtokens: payment.value_msat,
          secret: payment.payment_preimage,
          tokens: parseInt(payment.value_sat, decBase),
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
