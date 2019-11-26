const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const subscribeToPayViaDetails = require('./subscribe_to_pay_via_details');

/** Pay via payment details

  Requires LND built with `routerrpc` build tag

  If no id is specified, a random id will be used.

  Specifying `max_fee_mtokens`/`mtokens` is not supported in LND 0.8.1 or below

  `incoming_peer` is not supported on LND 0.8.1 and below

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key String>
    [id]: <Payment Request Hash Hex String>
    [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [mtokens]: <Millitokens to Pay String>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    routes: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    tokens: <Tokens To Pay Number>
  }

  @returns via cbk or Promise
  {
    fee: <Total Fee Tokens Paid Number>
    fee_mtokens: <Total Fee Millitokens Paid String>
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
        if (!args.destination) {
          return cbk([400, 'ExpectedDestinationToPayViaDetails']);
        }

        if (!args.lnd || !args.lnd.router) {
          return cbk([400, 'ExpectedAuthenticatedLndToPayViaDetails']);
        }

        if (!args.tokens) {
          return cbk([400, 'ExpectedTokenAmountToPayViaDetails']);
        }

        return cbk();
      },

      // Pay
      pay: ['validate', ({}, cbk) => {
        const sub = subscribeToPayViaDetails({
          cltv_delta: args.cltv_delta,
          destination: args.destination,
          id: args.id,
          incoming_peer: args.incoming_peer,
          lnd: args.lnd,
          max_fee: args.max_fee,
          max_fee_mtokens: args.max_fee_mtokens,
          max_timeout_height: args.max_timeout_height,
          mtokens: args.mtokens,
          outgoing_channel: args.outgoing_channel,
          pathfinding_timeout: args.pathfinding_timeout,
          routes: args.routes,
          tokens: args.tokens,
        });

        const finished = (err, res) => {
          sub.removeAllListeners();

          if (!!err) {
            return cbk([503, 'UnexpectedErrorPayingViaPaymentDetails', {err}]);
          }

          if (!!res.failed && !!res.failed.is_invalid_payment) {
            const {route} = res.failed;

            return cbk([503, 'PaymentRejectedByDestination', {route}]);
          }

          if (!!res.failed && !!res.failed.is_pathfinding_timeout) {
            return cbk([503, 'PaymentAttemptsTimedOut']);
          }

          if (!!res.failed) {
            return cbk([503, 'FailedToFindPayableRouteToDestination']);
          }

          if (!res.confirmed) {
            return cbk([503, 'UnexpectedOutcomeOfPayViaDetails']);
          }

          return cbk(null, {
            fee: res.confirmed.fee,
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
