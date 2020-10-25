const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');
const subscribeToPayViaDetails = require('lightning/lnd_methods');

const defaultTokens = 1;

/** Determine if a payment destination is actually payable by probing it

  Requires `offchain:write` permission

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Pay to Node with Public Key Hex String>
    [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
    lnd: <Authenticated LND API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens String>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [mtokens]: <Paying Millitokens String>
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
        const tokens = !args.mtokens ? null : args.tokens || defaultTokens;

        const sub = subscribeToPayViaDetails({
          cltv_delta: args.cltv_delta,
          destination: args.destination,
          lnd: args.lnd,
          max_fee: args.max_fee,
          max_fee_mtokens: args.max_fee_mtokens,
          max_timeout_height: args.max_timeout_height,
          mtokens: args.mtokens,
          outgoing_channel: args.outgoing_channel,
          pathfinding_timeout: args.pathfinding_timeout,
          routes: args.routes,
          tokens: tokens || undefined,
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
