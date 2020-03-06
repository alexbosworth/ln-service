const asyncAuto = require('async/auto');
const {chanNumber} = require('bolt07');
const {returnResult} = require('asyncjs-util');
const {routesFromQueryRoutes} = require('lightning/lnd_responses');

const defaultFinalCltvDelta = 40;
const defaultMtokens = '1000000';
const {isArray} = Array;
const tokAsMtok = tokens => (BigInt(tokens) * BigInt(1e3)).toString();
const unknownServiceMessage = 'unknown service routerrpc.Router';

/** Get an outbound route that goes through specific hops

  Requires LND built with `routerrpc` build tag

  This method is not supported by LND v0.7.1 or below LNDs

  {
    [cltv_delta]: <Final CLTV Delta Number>
    lnd: <Authenticated LND gRPC API Object>
    [mtokens]: <Millitokens to Send String>
    [outgoing_channel]: <Outgoing Channel Id String>
    public_keys: [<Public Key Hex String>]
    [tokens]: <Tokens to Send Number>
  }

  @returns via cbk or Promise
  {
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
        public_key: <Forward Edge Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.router) {
          return cbk([400, 'ExpectedLndWithRouterToGetRouteThroughHops']);
        }

        if (!!args.mtokens && !!args.tokens) {
          return cbk([400, 'ExpectedEitherMtokensOrTokensNotBoth']);
        }

        if (!isArray(args.public_keys)) {
          return cbk([400, 'ExpectedPublicKeysToGetRouteThroughHops']);
        }

        if (!args.public_keys.length) {
          return cbk([400, 'ExpectedPublicKeyToSentToInRouteThroughHops']);
        }

        return cbk();
      },

      // Get the route
      getRoute: ['validate', ({}, cbk) => {
        const channel = args.outgoing_channel;

        const outgoingId = !channel ? undefined : chanNumber({channel}).number;

        const mtokenTokens = !args.tokens ? undefined : tokAsMtok(args.tokens);

        return args.lnd.router.buildRoute({
          amt_msat: mtokenTokens || args.mtokens || defaultMtokens,
          final_cltv_delta: args.cltv_delta || defaultFinalCltvDelta,
          hop_pubkeys: args.public_keys.map(n => Buffer.from(n, 'hex')),
          outgoing_chan_id: outgoingId,
        },
        (err, res) => {
          if (!!err && err.details === unknownServiceMessage) {
            return cbk([501, 'ExpectedRouterRpcWithGetRouteMethod']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingRouteForHops', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseWhenGettingRouteForHops']);
          }

          if (!res.route) {
            return cbk([503, 'ExpectedRouteWhenGettingRouteForHops']);
          }

          const response = {routes: [res.route]};

          try {
            const [route] = routesFromQueryRoutes({response}).routes;

            return cbk(null, {route});
          } catch (err) {
            return cbk([503, 'UnexpectedErrorParsingRouteForHops', {err}]);
          }
        });
      }],
    },
    returnResult({reject, resolve, of: 'getRoute'}, cbk));
  });
};
