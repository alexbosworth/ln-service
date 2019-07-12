const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const subscribeToPayViaDetails = require('./subscribe_to_pay_via_details');

/** Pay via payment details

  Requires lnd built with routerrpc build tag

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key String>
    [id]: <Payment Request Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    routes: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
    tokens: <Tokens To Pay Number>
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
    mtokens: <Total Millitokens To Pay String>
    secret: <Payment Preimage Hex String>
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
          lnd: args.lnd,
          max_fee: args.max_fee,
          outgoing_channel: args.outgoing_channel,
          pathfinding_timeout: args.pathfinding_timeout,
          routes: args.routes,
          timeout_height: args.timeout_height,
          tokens: args.tokens,
        });

        const finished = (err, res) => {
          sub.removeAllListeners();

          if (!!err) {
            return cbk([503, 'UnexpectedErrorPayingViaPaymentDetails', {err}]);
          }

          if (!!res.failed && !!res.failed.is_invalid_payment) {
            return cbk([503, 'PaymentRejectedByDestination']);
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
            fee_mtokens: res.confirmed.fee_mtokens,
            hops: res.confirmed.hops,
            id: res.confirmed.id,
            mtokens: res.confirmed.mtokens,
            secret: res.confirmed.secret,
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
