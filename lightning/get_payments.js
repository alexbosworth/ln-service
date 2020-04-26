const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {returnResult} = require('asyncjs-util');
const {rpcPaymentAsPayment} = require('lightning/lnd_responses');

const {rpcAttemptHtlcAsAttempt} = require('./../routing');
const {sortBy} = require('./../arrays');

const defaultLimit = 1e6;
const {isArray} = Array;
const lastPageFirstIndexOffset = 1;
const msPerSecond = 1e3;
const {parse} = JSON;
const {stringify} = JSON;

/** Get payments made through channels.

  Requires `offchain:read` permission

  Payment `attempts` is not populated on LND 0.8.2 and below
  Payment `limit` is not supported on LND 0.9.2 and below

  {
    [limit]: <Page Result Limit Number>
    lnd: <Authenticated LND API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    payments: [{
      attempts: [{
        [failure]: {
          code: <Error Type Code Number>
          [details]: {
            [channel]: <Standard Format Channel Id String>
            [height]: <Error Associated Block Height Number>
            [index]: <Failed Hop Index Number>
            [mtokens]: <Error Millitokens String>
            [policy]: {
              base_fee_mtokens: <Base Fee Millitokens String>
              cltv_delta: <Locktime Delta Number>
              fee_rate: <Fees Charged Per Million Tokens Number>
              [is_disabled]: <Channel is Disabled Bool>
              max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
              min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
              updated_at: <Updated At ISO 8601 Date String>
            }
            [timeout_height]: <Error CLTV Timeout Height Number>
            [update]: {
              chain: <Chain Id Hex String>
              channel_flags: <Channel Flags Number>
              extra_opaque_data: <Extra Opaque Data Hex String>
              message_flags: <Message Flags Number>
              signature: <Channel Update Signature Hex String>
            }
          }
          message: <Error Message String>
        }
        is_confirmed: <Payment Attempt Succeeded Bool>
        is_failed: <Payment Attempt Failed Bool>
        is_pending: <Payment Attempt is Waiting For Resolution Bool>
        route: {
          fee: <Route Fee Tokens Number>
          fee_mtokens: <Route Fee Millitokens String>
          hops: [{
            channel: <Standard Format Channel Id String>
            channel_capacity: <Channel Capacity Tokens Number>
            fee: <Fee Number>
            fee_mtokens: <Fee Millitokens String>
            forward: <Forward Tokens Number>
            forward_mtokens: <Forward Millitokens String>
            [public_key]: <Forward Edge Public Key Hex String>
            [timeout]: <Timeout Block Height Number>
          }]
          mtokens: <Total Fee-Inclusive Millitokens String>
          [payment]: <Payment Identifier Hex String>
          timeout: <Timeout Block Height Number>
          tokens: <Total Fee-Inclusive Tokens Number>
          [total_mtokens]: <Total Millitokens String>
        }
      }]
      created_at: <Payment at ISO-8601 Date String>
      destination: <Destination Node Public Key Hex String>
      fee: <Paid Routing Fee Rounded Down Tokens Number>
      fee_mtokens: <Paid Routing Fee in Millitokens String>
      hops: [<First Route Hop Public Key Hex String>]
      id: <Payment Preimage Hash String>
      is_confirmed: <Payment is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      mtokens: <Millitokens Sent to Destination String>
      [request]: <BOLT 11 Payment Request String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      secret: <Payment Preimage Hex String>
      tokens: <Rounded Down Tokens Sent to Destination Number>
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
module.exports = ({limit, lnd, token}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!!limit && !!token) {
          return cbk([400, 'UnexpectedLimitWhenPagingPaymentsWithToken']);
        }

        if (!lnd || !lnd.default || !lnd.default.listPayments) {
          return cbk([400, 'ExpectedLndForGetPaymentsRequest']);
        }

        return cbk();
      },

      // Get all payments
      listPayments: ['validate', ({}, cbk) => {
        let offset;
        let resultsLimit = limit || defaultLimit;

        if (!!token) {
          try {
            const pagingToken = parse(token);

            offset = pagingToken.offset;
            resultsLimit = pagingToken.limit;
          } catch (err) {
            return cbk([400, 'ExpectedValidPagingTokenForPaymentReq', {err}]);
          }
        }

        return lnd.default.listPayments({
          index_offset: offset || Number(),
          max_payments: resultsLimit,
          reversed: true,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedGetPaymentsError', {err}]);
          }

          if (!res || !isArray(res.payments)) {
            return cbk([503, 'ExpectedPaymentsInListPaymentsResponse']);
          }

          if (typeof res.last_index_offset !== 'string') {
            return cbk([503, 'ExpectedLastIndexOffsetWhenRequestingPayments']);
          }

          const lastOffset = Number(res.last_index_offset);
          const offset = Number(res.first_index_offset);

          // On LND 0.9.2 and below, there is no paging of payments
          if (!lastOffset && !offset) {
            return cbk(null, {payments: res.payments});
          }

          const token = stringify({offset, limit: resultsLimit});

          return cbk(null, {
            payments: res.payments,
            token: offset === lastPageFirstIndexOffset ? undefined : token,
          });
        });
      }],

      // Check and map payments
      foundPayments: ['listPayments', ({listPayments}, cbk) => {
        return asyncMap(listPayments.payments, (payment, cbk) => {
          try {
            return cbk(null, rpcPaymentAsPayment(payment));
          } catch (err) {
            return cbk([503, err.message]);
          }
        },
        cbk);
      }],

      // Final found payments
      payments: [
        'foundPayments',
        'listPayments',
        ({foundPayments, listPayments}, cbk) =>
      {
        const payments = sortBy({
          array: foundPayments,
          attribute: 'created_at',
        });

        return cbk(null, {
          payments: payments.sorted.reverse(),
          next: !!foundPayments.length ? listPayments.token : undefined,
        });
      }],
    },
    returnResult({reject, resolve, of: 'payments'}, cbk));
  });
};
