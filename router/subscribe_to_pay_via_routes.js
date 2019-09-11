const EventEmitter = require('events');
const {randomBytes} = require('crypto');

const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {chanNumber} = require('bolt07');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');
const {getChannel} = require('./../lightning');
const {getWalletInfo} = require('./../lightning');
const paymentFailure = require('./payment_failure');
const rpcRouteFromRoute = require('./rpc_route_from_route');

const {isArray} = Array;
const {nextTick} = process;
const {now} = Date;
const payHashLength = Buffer.alloc(32).length;
const timeoutError = 'payment attempt not completed before timeout';
const unknownWireError = 'unknown wire error';

/** Subscribe to the attempts of paying via specified routes

  Requires lnd built with routerrpc build tag

  {
    [id]: <Payment Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    routes: [{
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
    }]
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'failure'
  {
    failure: [
      <Code Number>
      <Failure Message String>
      {
        channel: <Standard Format Channel Id String>
        [index]: <Failure Hop Index Number>
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
        [update]: {
          chain: <Chain Id Hex String>
          channel_flags: <Channel Flags Number>
          extra_opaque_data: <Extra Opaque Data Hex String>
          message_flags: <Message Flags Number>
          signature: <Channel Update Signature Hex String>
        }
      }
    ]
  }

  @event 'paying'
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
    [index]: <Failure Hop Index Number>
    [mtokens]: <Failure Related Millitokens String>
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
    [timeout_height]: <Failure Related CLTV Timeout Height Number>
    [update]: {
      chain: <Chain Id Hex String>
      channel_flags: <Channel Flags Number>
      extra_opaque_data: <Extra Opaque Data Hex String>
      message_flags: <Message Flags Number>
      signature: <Channel Update Signature Hex String>
    }
  }

  @event 'success'
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid Millitokens String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Hop Channel Capacity Tokens Number>
      fee_mtokens: <Hop Forward Fee Millitokens String>
      forward_mtokens: <Hop Forwarded Millitokens String>
      timeout: <Hop CLTV Expiry Block Height Number>
    }]
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <Total Millitokens Sent String>
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
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Number>
  }
*/
module.exports = args => {
  if (!!args.id && !isHex(args.id)) {
    throw new Error('ExpectedPaymentHashToPayViaRoutes');
  }

  if (!args.lnd || !args.lnd.router || !args.lnd.router.sendToRoute) {
    throw new Error('ExpectedAuthenticatedLndToPayViaRoutes');
  }

  if (!isArray(args.routes) || !args.routes.length) {
    throw new Error('ExpectedArrayOfPaymentRoutesToPayViaRoutes');
  }

  const id = args.id || randomBytes(payHashLength).toString('hex');

  if (!!args.routes.find(n => n.hops.find(hop => !hop.public_key))) {
    throw new Error('ExpectedPublicKeyInPayViaRouteHops');
  }

  try {
    args.routes.forEach(({hops}) => {
      return hops.forEach(({channel}) => chanNumber({channel}));
    });
  } catch (err) {
    throw new Error('ExpectedValidRouteChannelIdsForPayViaRoutes');
  }

  const emitter = new EventEmitter();
  let isPayDone = false;
  const pathfindingTimeout = args.pathfinding_timeout;
  let payFailed = null;
  let payResult = null;
  const start = now();

  asyncMapSeries(args.routes, (route, cbk) => {
    // Exit early without trying a payment when there is a definitive result
    if (!!isPayDone) {
      return nextTick(cbk);
    }

    if (!!pathfindingTimeout && now() - start > pathfindingTimeout) {
      return cbk([503, 'PathfindingTimeoutExceeded']);
    }

    return asyncAuto({
      // Wait for subscription pick up
      waitForSubscribers: cbk => nextTick(cbk),

      // Get info
      getInfo: cbk => getWalletInfo({lnd: args.lnd}, cbk),

      // Try paying
      attempt: ['getInfo', 'waitForSubscribers', ({getInfo}, cbk) => {
        emitter.emit('paying', {route});

        return args.lnd.router.sendToRoute({
          payment_hash: Buffer.from(id, 'hex'),
          route: rpcRouteFromRoute(route),
        },
        (err, res) => {
          if (!!err && err.details === unknownWireError) {
            return cbk(null, {});
          }

          if (!!err && err.details === timeoutError) {
            return cbk(null, {});
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorWhenPayingViaRoute', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseFromLndWhenPayingViaRoute']);
          }

          const failure = res.failure;

          const failKey = !failure ? undefined : failure.failure_source_pubkey;

          // When the source pubkey is populated it means fail index is invalid
          if (!!res.failure && !!res.failure.failure_source_pubkey.length) {
            delete failure.failure_source_index;
          }

          const failAt = !failure ? undefined : failure.failure_source_index;

          // When the fail index exists, populate the source pubkey
          if (!!failKey && !failKey.length && failAt !== undefined) {
            const failureSource = !failAt ? getInfo : route.hops[failAt - 1];

            const failHopKey = failureSource.public_key;

            res.failure.failure_source_pubkey = Buffer.from(failHopKey, 'hex');
          }

          if (!!res.failure && !res.failure.failure_source_pubkey) {
            return cbk([503, 'ExpectedFailureSourcePublicKeyInFailDetails']);
          }

          return cbk(null, {failure: res.failure, preimage: res.preimage});
        });
      }],

      // Public keys associated
      keys: ['attempt', ({attempt}, cbk) => {
        if (!attempt.failure || !attempt.failure.channel_update) {
          return cbk();
        }

        const update = attempt.failure.channel_update;

        if (!update || !update.chan_id) {
          return cbk();
        }

        try {
          const {channel} = chanFormat({number: update.chan_id});

          const hopIndex = route.hops.findIndex(n => n.channel === channel);

          if (!hopIndex || hopIndex === -1) {
            return cbk();
          }

          const hops = [route.hops[hopIndex], route.hops[hopIndex - 1]];

          return cbk(null, hops.filter(n => !!n).map(hop => hop.public_key));
        } catch (err) {
          return cbk([500, 'UnexpectedErrorParsingFailedChannel', {err}]);
        }
      }],

      // Parsed out failure
      failure: ['attempt', 'keys', ({attempt, keys}, cbk) => {
        if (!attempt.failure) {
          return cbk();
        }

        let channel;
        const failKey = attempt.failure.failure_source_pubkey;
        const {failure} = attempt;
        const {hops} = route;

        // A fail index indicates the hop channel that failed
        if (failure.failure_source_index !== undefined) {
          channel = (hops[failure.failure_source_index] || {}).channel;
        } else if (!!failKey) {
          const key = failKey.toString('hex');

          const failIndex = hops.findIndex(n => n.public_key === key);

          // A fail key can be used to find the channel within the route
          channel = (hops[failIndex - [key].length] || {}).channel;
        }

        return cbk(null, paymentFailure({channel, failure, keys}));
      }],

      // Attempt success
      success: ['attempt', ({attempt}, cbk) => {
        if (!!attempt.failure || !attempt.preimage) {
          return cbk();
        }

        if (!Buffer.isBuffer(attempt.preimage)) {
          return cbk([503, 'UnexpectedResultWhenPayingViaSendToRouteSync']);
        }

        return cbk(null, {
          fee: route.fee,
          fee_mtokens: route.fee_mtokens,
          hops: route.hops,
          mtokens: route.mtokens,
          secret: attempt.preimage.toString('hex'),
          tokens: route.tokens,
        });
      }],

      // Set pay result and pay error
      result: ['failure', 'success', ({failure, success}, cbk) => {
        // Exit early when there was no result of the pay attempt
        if (!failure && !success) {
          return cbk();
        }

        const [finalHop] = route.hops.slice().reverse();
        const hasDetails = !!failure && !!failure.details;

        // Failures from the final hop are definitive
        if (hasDetails && failure.details.public_key === finalHop.public_key) {
          isPayDone = !!failure;
        }

        // A routing failure was encountered
        if (hasDetails) {
          emitter.emit('routing_failure', {
            route,
            channel: failure.details.channel,
            index: failure.details.index,
            mtokens: failure.details.mtokens,
            policy: failure.details.policy,
            public_key: failure.details.public_key,
            reason: failure.message,
            timeout_height: failure.details.timeout_height,
            update: failure.details.update,
          });
        }

        // A failure instance has been received for this route
        if (!!failure) {
          payFailed = failure;

          emitter.emit('failure', {
            failure: [failure.code, failure.message, failure.details],
          });

          return cbk();
        }

        isPayDone = !!success;
        payResult = success;

        emitter.emit('success', {
          id,
          route,
          fee: success.fee,
          fee_mtokens: success.fee_mtokens,
          hops: success.hops,
          mtokens: success.mtokens,
          secret: success.secret,
          tokens: success.tokens,
        });

        return cbk();
      }],
    },
    returnResult({}, cbk));
  },
  err => {
    if (!!err) {
      emitter.emit('error', err);
    }

    return emitter.emit('end');
  });

  return emitter;
};
