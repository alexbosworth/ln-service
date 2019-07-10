const asyncAuto = require('async/auto');
const asyncTimeout = require('async/timeout');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const subscribeToProbe = require('./subscribe_to_probe');

const defaultProbeTimeoutMs = 1000 * 60;
const {isArray} = Array;

/** Probe to find a successful route

  Requires lnd built with routerrpc build tag

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [ignore_probability_below]: <Require a Minimum N out of 1 Million Number>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    tokens: <Tokens Number>
  }

  @returns via cbk or Promise
  {
    [route]: {
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
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.destination || !isHex(args.destination)) {
          return cbk([400, 'ExpectedDestinationKeyHexStringForRouteProbe']);
        }

        if (!!args.ignore && !isArray(args.ignore)) {
          return cbk([400, 'ExpectedIgnoreAsArrayWhenProbingForRoute'])
        }

        if (!args.lnd || !args.lnd.router) {
          return cbk([400, 'ExpectedAuthenticatedLndToProbeForRoute']);
        }

        if (!args.tokens) {
          return cbk([400, 'ExpectedTokensValueToProbeForRoute']);
        }

        return cbk();
      },

      // Probe
      probe: ['validate', ({}, cbk) => {
        const result = {};
        let isFinished = false;
        let timeout;

        const sub = subscribeToProbe({
          cltv_delta: args.cltv_delta,
          destination: args.destination,
          ignore: args.ignore,
          ignore_probability_below: args.ignore_probability_below,
          lnd: args.lnd,
          max_fee: args.max_fee,
          routes: args.routes,
          tokens: args.tokens,
        });

        const finished = (err, res) => {
          sub.removeAllListeners();

          clearTimeout(timeout);

          return cbk(err, res);
        };

        timeout = setTimeout(
          () => finished([503, 'ProbeForRouteTimedOut']),
          args.pathfinding_timeout || defaultProbeTimeoutMs
        );

        sub.on('error', err => finished(err));

        sub.on('probe_success', ({route}) => finished(null, {route}));

        sub.on('routing_failure', failure => {
          return finished([503, 'RoutingFailure', {failure}]);
        });

        sub.once('end', () => finished(null, {}));

        return;
      }],
    },
    returnResult({reject, resolve, of: 'probe'}, cbk));
  });
};
