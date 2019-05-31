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
const paymentFailure = require('./payment_failure');
const rowTypes = require('./../lightning/conf/row_types');
const rpcRouteFromRoute = require('./rpc_route_from_route');

const {isArray} = Array;
const {nextTick} = process;
const {now} = Date;
const payHashLength = Buffer.alloc(32).length;

/** Subscribe to the attempts of paying via routes

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
    }
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'failure'
  {
    failure: [<Code Number>, <Failure Message String>, <Details Object>]
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
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Number>
    type: <Type String>
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
      return cbk();
    }

    if (!!pathfindingTimeout && now() - start > pathfindingTimeout) {
      return cbk([503, 'PathfindingTimeoutExceeded']);
    }

    return asyncAuto({
      // Wait for subscription pick up
      waitForSubscribers: cbk => nextTick(cbk),

      // Try paying
      attempt: ['waitForSubscribers', ({}, cbk) => {
        return args.lnd.router.sendToRoute({
          payment_hash: Buffer.from(id, 'hex'),
          route: rpcRouteFromRoute(route),
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorWhenPayingViaRoute', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseFromLndWhenPayingViaRoute']);
          }

          return cbk(null, res);
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

          return cbk(null, hops.map(hop => hop.public_key));
        } catch (err) {
          return cbk([500, 'UnexpectedErrorParsingFailedChannel', {err}]);
        }
      }],

      // Parsed out failure
      failure: ['attempt', 'keys', ({attempt, keys}, cbk) => {
        if (!attempt.failure) {
          return cbk();
        }

        return cbk(null, paymentFailure({keys, failure: attempt.failure}));
      }],

      // Attempt success
      success: ['attempt', ({attempt}, cbk) => {
        if (!!attempt.failure) {
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
        const [finalHop] = route.hops.slice().reverse();

        // Failures from the final hop are definitive
        if (!!failure && failure.details.public_key === finalHop.public_key) {
          isPayDone = !!failure;
        }

        // A failure instance has been received for this route
        if (!!failure) {
          payFailed = failure;

          emitter.emit('failure', {
            failure: [failure.code, failure.message, failure.details],
          });

          return cbk();
        }

        // Attempts should either result in a failure or a success
        if (!success) {
          return cbk([500, 'UnexpectedResultWhenPayingViaRoutes']);
        }

        isPayDone = !!success;
        payResult = success;

        emitter.emit('success', {
          id,
          fee: success.fee,
          fee_mtokens: success.fee_mtokens,
          hops: success.hops,
          is_confirmed: true,
          is_outgoing: true,
          mtokens: success.mtokens,
          secret: success.secret,
          tokens: success.tokens,
          type: rowTypes.channel_transaction,
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

    return emitter.emit('end', {});
  });

  return emitter;
};
