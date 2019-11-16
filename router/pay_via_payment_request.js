const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const subscribeToPayViaRequest = require('./subscribe_to_pay_via_request');

const {isArray} = Array;

/** Pay via payment request

  Requires LND built with `routerrpc` build tag

  Specifying `max_fee_mtokens`/`mtokens` is not supported in LND 0.8.1 or below

  {
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [mtokens]: <Millitokens to Pay String>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    request: <BOLT 11 Payment Request String>
    [tokens]: <Tokens To Pay Number>
  }

  @returns via cbk or Promise
  {
    fee_mtokens: <Total Fee Millitokens To Pay String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      fee_mtokens: <Fee Millitokens String>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Public Key Hex String>
      timeout: <Timeout Block Height Number>
    }]
    [id]: <Payment Hash Hex String>
    mtokens: <Total Millitokens Paid String>
    secret: <Payment Preimage Hex String>
    tokens: <Tokens Paid Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.router) {
          return cbk([400, 'ExpectedAuthenticatedLndToPayPaymentRequest']);
        }

        if (!args.request) {
          return cbk([400, 'ExpectedPaymentRequestToPayViaPaymentRequest']);
        }

        if (!!args.routes && !isArray(args.routes)) {
          return cbk([400, 'UnexpectedFormatForRoutesWhenPayingViaRequest']);
        }

        return cbk();
      },

      // Pay payment request
      pay: ['validate', ({}, cbk) => {
        const sub = subscribeToPayViaRequest({
          lnd: args.lnd,
          max_fee: args.max_fee,
          max_fee_mtokens: args.max_fee_mtokens,
          max_timeout_height: args.max_timeout_height,
          mtokens: args.mtokens,
          outgoing_channel: args.outgoing_channel,
          pathfinding_timeout: args.pathfinding_timeout,
          request: args.request,
          tokens: args.tokens,
        });

        const finished = (err, res) => {
          sub.removeAllListeners();

          if (!!err) {
            return cbk([503, 'UnexpectedErrorPayingViaPaymentRequest', {err}]);
          }

          if (!!res.failed && !!res.failed.is_invalid_payment) {
            return cbk([503, 'PaymentRejectedByDestination']);
          }

          if (!!res.failed && !!res.failed.is_pathfinding_timeout) {
            return cbk([503, 'PaymentAttemptsTimedOut']);
          }

          if (!!res.failed && !!res.failed.is_route_not_found) {
            return cbk([503, 'PaymentPathfindingFailedToFindPossibleRoute']);
          }

          if (!!res.failed) {
            return cbk([503, 'FailedToFindPayableRouteToDestination']);
          }

          if (!res.confirmed) {
            return cbk([503, 'UnexpectedOutcomeOfPayViaDetails']);
          }

          return cbk(null, {
            fee_mtokens: res.confirmed.fee_mtokens,
            hops: res.confirmed.hops,
            id: res.confirmed.id,
            mtokens: res.confirmed.mtokens,
            secret: res.confirmed.secret,
            tokens: res.confirmed.tokens,
          });
        };

        sub.once('confirmed', confirmed => finished(null, {confirmed}));
        sub.once('error', err => finished(err));
        sub.once('failed', failed => finished(null, {failed}));

        return;
      }],
    },
    returnResult({reject, resolve, of: 'pay'}, cbk));
  });
};
