const EventEmitter = require('events');

const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncWhilst = require('async/whilst');
const {subscribeToPayViaRoutes} = require('lightning/lnd_methods');

const {getRoutes} = require('./../lightning');
const ignoreFromRoutingFailure = require('./ignore_from_routing_failure');

const defaultPathTimeoutMs = 1000 * 60;
const defaultProbeTimeoutMs = 1000 * 60 * 60 * 24;
const flatten = arr => [].concat(...arr);
const {isArray} = Array;
const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);

/** Subscribe to a probe attempt

  Requires LND built with `routerrpc` build tag

  `is_ignoring_past_failures` will turn off LND 0.7.1+ past failure pathfinding

  `confidence` is not supported in LND 0.7.1

  On LND 0.9.0, use subscribeToProbeForRoute instead

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [is_ignoring_past_failures]: <Ignore Past Failures When Finding Path Bool>
    [is_strict_hints]: <Only Route Through Specified Paths Bool>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Probe String>
    [max_timeout_height]: <Maximum CLTV Timeout Height Number>
    [mtokens]: <Millitokens to Probe String>
    [outgoing_channel]: <Outgoing Channel Id String>
    [path_timeout_ms]: <Skip Path Attempt After Milliseconds Number>
    [probe_timeout_ms]: <Fail Probe After Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [tokens]: <Tokens to Probe Number>
  }

  @returns
  <Probe Subscription Event Emitter Object>

  @event 'error'
  [<Failure Code Number>, <Failure Message String>]

  @event 'probe_success'
  {
    route: {
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens To Pay String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sent Tokens Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
  }

  @event 'probing'
  {
    route: {
      [confidence]: <Route Confidence Score Out Of One Million Number>
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      index: <Failure Index Number>
      mtokens: <Total Millitokens To Pay String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sending Tokens Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
  }

  @event 'routing_failure'
  {
    [channel]: <Standard Format Channel Id String>
    [mtokens]: <Millitokens String>
    [policy]: {
      base_fee_mtokens: <Base Fee Millitokens String>
      cltv_delta: <Locktime Delta Number>
      fee_rate: <Fees Charged Per Million Tokens Number>
      [is_disabled]: <Channel is Disabled Bool>
      max_htlc_mtokens: <Maximum HLTC Millitokens Value String>
      min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
    }
    public_key: <Public Key Hex String>
    reason: <Failure Reason String>
    route: {
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens To Pay String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
    [update]: {
      chain: <Chain Id Hex String>
      channel_flags: <Channel Flags Number>
      extra_opaque_data: <Extra Opaque Data Hex String>
      message_flags: <Message Flags Number>
      signature: <Channel Update Signature Hex String>
    }
  }
*/
module.exports = args => {
  if (!args.destination || !isHex(args.destination)) {
    throw new Error('ExpectedDestinationPublicKeyToSubscribeToProbe');
  }

  if (!!args.ignore && !isArray(args.ignore)) {
    throw new Error('ExpectedIgnoreEdgesArrayInProbeSubscription');
  }

  if (!args.lnd || !args.lnd.router) {
    throw new Error('ExpectedRouterRpcToSubscribeToProbe');
  }

  if (!args.tokens && !args.mtokens) {
    throw new Error('ExpectedTokenAmountToSubscribeToProbe');
  }

  const emitter = new EventEmitter();
  const ignore = [];
  let isFinal = false;
  let isTimedOut = false;

  (args.ignore || []).forEach(n => {
    return ignore.push({
      channel: n.channel,
      from_public_key: n.from_public_key,
      to_public_key: n.to_public_key,
    });
  });

  const probeTimeout = setTimeout(() => {
    isFinal = true;
    isTimedOut = true;

    emitter.emit('error', [503, 'ProbeTimeout']);

    emitter.emit('end');

    return;
  },
  args.probe_timeout_ms || defaultProbeTimeoutMs);

  asyncWhilst(
    cbk => cbk(null, !isFinal),
    cbk => {
      return asyncAuto({
        // Get the next route
        getNextRoute: cbk => {
          const directIgnores = args.ignore || [];
          const isIgnoringFailures = !!args.is_ignoring_past_failures;
          const isOutConstrained = !!args.outgoing_channel;

          const isNotConstrained = !isIgnoringFailures && !isOutConstrained;

          const allIgnores = [].concat(directIgnores).concat(ignore.slice());

          return getRoutes({
            cltv_delta: args.cltv_delta,
            destination: args.destination,
            ignore: isNotConstrained ? directIgnores : allIgnores,
            is_adjusted_for_past_failures: !args.is_ignoring_past_failures,
            is_strict_hints: args.is_strict_hints,
            lnd: args.lnd,
            max_fee: args.max_fee,
            max_fee_mtokens: args.max_fee_mtokens,
            max_timeout_height: args.max_timeout_height,
            mtokens: args.mtokens,
            outgoing_channel: args.outgoing_channel,
            routes: args.routes,
            tokens: args.tokens,
          },
          cbk);
        },

        // Attempt paying the route
        attemptRoute: ['getNextRoute', ({getNextRoute}, cbk) => {
          const failures = [];
          const maxCltv = args.max_timeout_height;
          const {routes} = getNextRoute;

          if (!routes.length) {
            return cbk(null, {failures});
          }

          if (!!maxCltv && !!routes.find(n => n.timeout > maxCltv)) {
            return cbk(null, {failures});
          }

          // Start probing towards destination
          const sub = subscribeToPayViaRoutes({routes, lnd: args.lnd});

          let currentRoute;

          sub.on('paying', ({route}) => {
            currentRoute = route;

            if (!!isTimedOut) {
              return;
            }

            return emitter.emit('probing', {route})
          });

          const next = () => {
            sub.removeAllListeners();

            return cbk(null, {failures});
          };

          const routeTimeout = setTimeout(() => {
            const [lastHop] = currentRoute.hops.slice().reverse();

            currentRoute.hops.forEach(hop => {
              ignore.push({
                channel: hop.channel,
                to_public_key: hop.public_key,
              });
            });

            return next();
          },
          args.path_timeout_ms || defaultPathTimeoutMs);

          sub.on('routing_failure', failure => {
            const [finalHop] = failure.route.hops.slice().reverse();
            let toIgnore;

            failures.push(failure);

            if (failure.index === failure.route.hops.length) {
              isFinal = true;
            }

            try {
              toIgnore = ignoreFromRoutingFailure({
                channel: failure.channel,
                hops: failure.route.hops,
                index: failure.index,
                reason: failure.reason,
              });
            } catch (err) {
              return cbk([500, 'UnexpectedErrorDerivingProbeIgnore', {err}]);
            }

            toIgnore.ignore.forEach(edge => {
              return ignore.push({
                channel: edge.channel,
                from_public_key: edge.from_public_key,
                to_public_key: edge.to_public_key,
              });
            });

            // Exit early when the probe timed out
            if (!!isTimedOut) {
              return;
            }

            // Exit early when the probe found a completed route
            if (!!isFinal) {
              return emitter.emit('probe_success', {route: failure.route});
            }

            emitter.emit('routing_failure', {
              channel: failure.channel,
              index: failure.index,
              mtokens: failure.mtokens,
              policy: failure.policy || undefined,
              public_key: failure.public_key,
              reason: failure.reason,
              route: failure.route,
              update: failure.update,
            });

            return;
          });

          // Probing finished
          sub.on('end', () => {
            clearTimeout(routeTimeout);

            return next();
          });

          sub.on('error', err => {
            if (!!isTimedOut) {
              return;
            }

            emitter.emit('error', err);

            return;
          });

          return;
        }],
      },
      (err, res) => {
        if (!!err) {
          return cbk(err);
        }

        if (!!isFinal) {
          return cbk();
        }

        const {failures} = res.attemptRoute;

        failures
          .filter(failure => !!failure.channel && !!failure.public_key)
          .forEach(failure => ignore.push({
            channel: failure.failed,
            to_public_key: failure.public_key,
          }));

        if (!res.getNextRoute.routes.length) {
          isFinal = true;
        }

        return cbk();
      });
    },
    err => {
      // Exit early when the probe timed out
      if (!!isTimedOut) {
        return;
      }

      clearTimeout(probeTimeout);

      if (!!err) {
        emitter.emit('error', err);
      }

      emitter.emit('end');

      return;
    },
  );

  return emitter;
};
