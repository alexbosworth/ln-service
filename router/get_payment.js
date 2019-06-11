const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const subscribeToPastPayment = require('./subscribe_to_past_payment');

const paymentNotInitiatedErr = `payment isn't initiated`;

/** Get the status of a past payment

  {
    id: <Payment Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    [failed]: {
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
    }
    [is_confirmed]: <Payment Is Settled Bool>
    [is_failed]: <Payment Is Failed Bool>
    [is_pending]: <Payment Is Pending Bool>
    [payment]: {
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee_mtokens: <Fee Millitokens String>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      mtokens: <Total Millitokens To Pay String>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
    }
  }
*/
module.exports = ({id, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!id || !isHex(id)) {
          return cbk([400, 'ExpectedPaymentHashToLookupPastPaymentStatus']);
        }

        if (!lnd || !lnd.router) {
          return cbk([400, 'ExpectedLndGrpcApiObjectToLookupPayment']);
        }

        return cbk();
      },

      // Get payment status
      getStatus: ['validate', ({}, cbk) => {
        const sub = subscribeToPastPayment({id, lnd});

        const finished = (err, res) => {
          sub.removeAllListeners();

          if (!!err && err.details === paymentNotInitiatedErr) {
            return cbk([404, 'SentPaymentNotFound']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingPaymentStatus', {err}]);
          }

          return cbk(null, {
            failed: res.failed || undefined,
            is_confirmed: !!res.payment,
            is_failed: !!res.failed,
            is_pending: !res.payment && !res.failed,
            payment: res.payment || undefined,
          });
        };

        sub.once('confirmed', payment => finished(null, {payment}));
        sub.once('error', err => finished(err));
        sub.once('failed', failed => finished(null, {failed}));
        sub.once('paying', () => finished(null, {}));

        return;
      }],
    },
    returnResult({reject, resolve, of: 'getStatus'}, cbk));
  });
};
