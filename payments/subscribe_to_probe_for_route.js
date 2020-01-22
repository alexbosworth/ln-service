const EventEmitter = require('events');

const asyncAuto = require('async/auto');
const asyncWhilst = require('async/whilst');
const isHex = require('is-hex');

const {getRouteToDestination} = require('./../routing');
const {getWalletInfo} = require('./../lightning');
const {subscribeToPayViaRoutes} = require('./../router');

const defaultPathTimeoutMs = 1000 * 60;
const defaultProbeTimeoutMs = 1000 * 60 * 60 * 24;
const {isArray} = Array;

/** Subscribe to a probe attempt

  Requires LND built with `routerrpc` build tag

  This method is not supported on LND 0.8.2 or below.

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    [features]: [{
      bit: <Feature Bit Number>
    }]
    [ignore]: [{
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [incoming_peer]: <Incoming Peer Public Key Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Probe String>
    [max_timeout_height]: <Maximum CLTV Timeout Height Number>
    [messages]: [{
      type: <Message To Final Destination Type Number String>
      value: <Message To Final Destination Raw Value Hex Encoded String>
    }]
    [mtokens]: <Millitokens to Probe String>
    [outgoing_channel]: <Outgoing Channel Id String>
    [path_timeout_ms]: <Skip Individual Path Attempt After Milliseconds Number>
    [payment]: <Payment Identifier Hex Strimng>
    [probe_timeout_ms]: <Fail Entire Probe After Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [tokens]: <Tokens to Probe Number>
    [total_mtokens]: <Total Millitokens of Shards String>
  }

  @returns
  <Probe Subscription Event Emitter Object>

  @event 'error'
  [<Failure Code Number>, <Failure Message String>]

  @event 'probe_success'
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
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Millitokens To Pay String>
      [payment]: <Payment Identifier Hex String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sent Tokens Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
      [total_mtokens]: <Total Millitokens String>
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
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Millitokens To Pay String>
      [payment]: <Payment Identifier Hex String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sent Tokens Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
      [total_mtokens]: <Total Millitokens String>
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
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Millitokens To Pay String>
      [payment]: <Payment Identifier Hex String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sent Tokens Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
      [total_mtokens]: <Total Millitokens String>
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

  if (!!args.ignore) {
    args.ignore.forEach(n => ignore.push({
      from_public_key: n.from_public_key,
      to_public_key: n.to_public_key,
    }));
  }

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
        // Get public key
        getInfo: cbk => getWalletInfo({lnd: args.lnd}, cbk),

        // Get the next route
        getNextRoute: cbk => {
          return getRouteToDestination({
            ignore,
            cltv_delta: args.cltv_delta,
            destination: args.destination,
            features: args.features,
            incoming_peer: args.incoming_peer,
            lnd: args.lnd,
            max_fee: args.max_fee,
            max_fee_mtokens: args.max_fee_mtokens,
            max_timeout_height: args.max_timeout_height,
            messages: args.messages,
            mtokens: args.mtokens,
            outgoing_channel: args.outgoing_channel,
            payment: args.payment,
            routes: args.routes,
            tokens: args.tokens,
            total_mtokens: args.mtokens,
          },
          cbk);
        },

        // Attempt paying the route
        attemptRoute: [
          'getNextRoute',
          'getInfo',
          ({getInfo, getNextRoute}, cbk) =>
        {
          if (!getInfo.features.length) {
            return cbk([400, 'ExpectedFeaturesToSubscribeToProbeDestination']);
          }

          const maxCltv = args.max_timeout_height;
          const routes = [getNextRoute.route].filter(n => !!n);

          if (!routes.length) {
            return cbk(null, {});
          }

          if (!!maxCltv && !!routes.find(({timeout}) => timeout > maxCltv)) {
            return cbk(null, {});
          }

          let currentRoute;
          const sub = subscribeToPayViaRoutes({routes, lnd: args.lnd});

          sub.on('paying', ({route}) => {
            currentRoute = route;

            if (!!isTimedOut) {
              return;
            }

            return emitter.emit('probing', {route});
          });

          const next = () => {
            sub.removeAllListeners();

            return cbk(null, {});
          };

          const routeTimeout = setTimeout(() => {
            const [lastHop, penultimate] = currentRoute.hops.slice().reverse();

            const from = penultimate || getInfo;

            // Ignore the final pair
            currentRoute.hops.forEach(hop => {
              return ignore.push({
                from_public_key: from.public_key,
                to_public_key: hop.public_key,
              });
            });

            return next();
          },
          args.path_timeout_ms || defaultPathTimeoutMs);

          sub.on('routing_failure', failure => {
            if (failure.index === failure.route.hops.length) {
              isFinal = true;
            }

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

        if (!res.getNextRoute.route) {
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
