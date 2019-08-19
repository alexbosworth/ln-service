const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const subscribeToPayViaDetails = require('./subscribe_to_pay_via_details');

const defaultTokens = 1;

/** Determine if a payment destination is actually payable by probing it

  Requires lnd built with routerrpc build tag

  Note: on versions of lnd prior to 0.7.1, is_payable will always be false

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Pay to Node with Public Key Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
    [outgoing_channel]: <Pay Out of Outgoing Standard Format Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [tokens]: <Paying Tokens Number>
  }

  @returns via cbk or Promise
  {
    is_payable: <Payment Is Successfully Tested Within Constraints Bool>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.destination) {
          return cbk([400, 'ExpectedDestinationToCheckPayability']);
        }

        if (!args.lnd || !args.lnd.router) {
          return cbk([400, 'ExpectedAuthenticatedLndWithRouterToTestPayable']);
        }

        return cbk();
      },

      // Attempt payment
      probe: ['validate', ({}, cbk) => {
        const sub = subscribeToPayViaDetails({
          cltv_delta: args.cltv_delta,
          destination: args.destination,
          lnd: args.lnd,
          max_fee: args.max_fee,
          max_timeout_height: args.max_timeout_height,
          outgoing_channel: args.outgoing_channel,
          pathfinding_timeout: args.pathfinding_timeout,
          routes: args.routes,
          tokens: args.tokens || defaultTokens,
        });

        const finished = (err, res) => {
          sub.removeAllListeners();

          if (!!err) {
            return cbk([503, 'UnexpectedErrorCheckingPayability', {err}]);
          }

          return cbk(null, {is_payable: !!res && !!res.is_invalid_payment});
        };

        sub.once('error', err => finished(err));
        sub.once('failed', failed => finished(null, failed));

        return;
      }],
    },
    returnResult({reject, resolve, of: 'probe'}, cbk));
  });
};
