const EventEmitter = require('events');

const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncWhilst = require('async/whilst');
const {flatten} = require('lodash');
const isHex = require('is-hex');

const getForwardingReputations = require('./get_forwarding_reputations');
const {getChannel} = require('./../lightning');
const {getRoutes} = require('./../lightning');
const ignoreFromRoutingFailure = require('./ignore_from_routing_failure');
const subscribeToPayViaRoutes = require('./subscribe_to_pay_via_routes');

const defaultPathTimeoutMs = 1000 * 60;
const {isArray} = Array;

/** Subscribe to a probe attempt

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
    [path_timeout_ms]: <Skip Path Attempt After Milliseconds Number>
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
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
  }

  @event 'probing'
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
      max_htlc_mtokens: <Maximum HLTC Millitokens value String>
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

  if (!args.tokens) {
    throw new Error('ExpectedTokensToSubscribeToProbe');
  }

  const emitter = new EventEmitter();
  const ignore = [];
  let isFinal = false;

  (args.ignore || []).forEach(n => {
    return ignore.push({
      channel: n.channel,
      from_public_key: n.from_public_key,
      to_public_key: n.to_public_key,
    });
  });

  asyncWhilst(
    cbk => cbk(null, !isFinal),
    cbk => {
      return asyncAuto({
        // Get mission control likely-failure edges
        getReputations: cbk => {
          // Exit early when mission control is not to be consulted
          if (!args.ignore_probability_below) {
            return cbk(null, {nodes: []});
          }

          return getForwardingReputations({
            lnd: args.lnd,
            probability: args.ignore_probability_below,
            tokens: args.tokens,
          },
          cbk);
        },

        // Get the next route
        getNextRoute: ['getReputations', ({getReputations}, cbk) => {
          const likelyFailures = getReputations.nodes.map(node => {
            return node.channels.map(n => ({
              channel: n.id,
              from_public_key: node.public_key,
              to_public_key: n.to_public_key,
            }));
          });

          const allIgnores = []
            .concat(flatten(likelyFailures))
            .concat(ignore.slice());

          return getRoutes({
            destination: args.destination,
            fee: args.max_fee,
            ignore: allIgnores,
            lnd: args.lnd,
            routes: args.routes,
            timeout: args.cltv_delta,
            tokens: args.tokens,
          },
          cbk);
        }],

        // Attempt paying the route
        attemptRoute: ['getNextRoute', ({getNextRoute}, cbk) => {
          const failures = [];
          const {routes} = getNextRoute;

          if (!routes.length) {
            return cbk(null, {failures});
          }

          // Start probing towards destination
          const sub = subscribeToPayViaRoutes({routes, lnd: args.lnd});

          let currentRoute;

          sub.on('paying', ({route}) => {
            currentRoute = route;

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

            failures.push(failure);

            const isFinalNode = failure.public_key === finalHop.public_key;

            const toIgnore = ignoreFromRoutingFailure({
              channel: failure.channel,
              hops: failure.route.hops,
              public_key: failure.public_key,
              reason: failure.reason,
            });

            toIgnore.ignore.forEach(edge => {
              return ignore.push({
                channel: edge.channel,
                from_public_key: edge.from_public_key,
                to_public_key: edge.to_public_key,
              });
            });

            emitter.emit(isFinalNode ? 'probe_success' : 'routing_failure', {
              channel: failure.channel,
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

          sub.on('error', err => emitter.emit('error', err));

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

        if (!!failures.find(n => n.public_key === args.destination)) {
          isFinal = true;
        }

        return cbk();
      });
    },
    err => {
      if (!!err) {
        emitter.emit('error', err);
      }

      emitter.emit('end');

      return;
    },
  );

  return emitter;
};
