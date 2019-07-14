const {createHash} = require('crypto');
const EventEmitter = require('events');

const {chanFormat} = require('bolt07');
const {chanNumber} = require('bolt07');

const {routeHintFromRoute} = require('./../routing');
const {states} = require('./payment_states');

const decBase = 10;
const defaultTimeoutSeconds = 20;
const hexToBuf = hex => Buffer.from(hex, 'hex');
const {isArray} = Array;
const maxCltv = Number.MAX_SAFE_INTEGER;
const maxTokens = '4294967296';
const msPerSec = 1000;
const {round} = Math;
const sha256 = preimage => createHash('sha256').update(preimage).digest();

/** Subscribe to the flight of a payment

  Either a request or a destination, id, and tokens amount is required

  {
    [cltv_delta]: <Final CLTV Delta Number>
    [destination]: <Destination Public Key String>
    [id]: <Payment Request Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [request]: <BOLT 11 Payment Request String>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
    [tokens]: <Tokens To Pay Number>
  }

  @throws
  <Error>

  @returns
  <Subscription EventEmitter Object>

  @event 'confirmed'
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
    id: <Payment Hash Hex String>
    mtokens: <Total Millitokens To Pay String>
    secret: <Payment Preimage Hex String>
    timeout: <Expiration Block Height Number>
  }

  @event 'failed'
  {
    is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
  }

  @event 'paying
  {}
*/
module.exports = args => {
  if (!!args.cltv_delta && !!args.request) {
    throw new Error('UnexpectedCltvDeltaWhenSubscribingToPayPaymentRequest');
  }

  if (!args.destination && !args.request) {
    throw new Error('ExpectedDestinationWhenPaymentRequestNotSpecified');
  }

  if (!args.id && !args.request) {
    throw new Error('ExpectedPaymentHashWhenPaymentRequestNotSpecified');
  }

  if (!args.lnd || !args.lnd.router) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToPayment');
  }

  if (!args.tokens && !args.request){
    throw new Error('ExpectedTokenAmountToPayWhenPaymentRequestNotSpecified');
  }

  if (!!args.routes && !isArray(args.routes)) {
    throw new Error('UnexpectedFormatForRoutesWhenSubscribingToPayment');
  }

  if (!!args.routes) {
    try {
      args.routes.forEach(route => routeHintFromRoute({route}));
    } catch (err) {
      throw new Error('ExpectedValidRoutesWhenSubscribingToPayment');
    }
  }

  const emitter = new EventEmitter();
  const maxFee = args.max_fee !== undefined ? args.max_fee : maxTokens;
  const channel = !!args.outgoing_channel ? args.outgoing_channel : null;
  const routes = (args.routes || []);
  const timeoutSeconds = round((args.pathfinding_timeout || 0) / msPerSec);

  const hints = routes
    .map(route => ({hop_hints: routeHintFromRoute({route}).hops}));

  const sub = args.lnd.router.sendPayment({
    amt: !args.tokens ? undefined : args.tokens,
    cltv_limit: !args.timeout_height ? maxCltv : args.timeout_height,
    dest: !args.destination ? undefined : hexToBuf(args.destination),
    fee_limit_sat: maxFee,
    final_cltv_delta: !args.cltv_delta ? undefined : args.cltv_delta,
    outgoing_chan_id: !channel ? undefined : chanNumber({channel}).number,
    payment_hash: !args.id ? undefined : hexToBuf(args.id),
    payment_request: !args.request ? undefined : args.request,
    route_hints: !hints.length ? undefined : hints,
    timeout_seconds: timeoutSeconds || defaultTimeoutSeconds,
  });

  sub.on('data', data => {
    switch (data.state) {
    case states.confirmed:
      return emitter.emit('confirmed', {
        fee_mtokens: data.route.total_fees_msat,
        hops: data.route.hops.map(hop => ({
          channel: chanFormat({number: hop.chan_id}).channel,
          channel_capacity: parseInt(hop.chan_capacity, decBase),
          fee_mtokens: hop.fee_msat,
          forward_mtokens: hop.amt_to_forward_msat,
          timeout: hop.expiry,
        })),
        id: sha256(data.preimage).toString('hex'),
        mtokens: data.route.total_amt_msat,
        secret: data.preimage.toString('hex'),
      });

    case states.errored:
    case states.invalid_payment:
    case states.pathfinding_routes_failed:
    case states.pathfinding_timeout_failed:
      return emitter.emit('failed', ({
        is_invalid_payment: data.state === states.invalid_payment,
        is_pathfinding_timeout: data.state === states.pathfinding_timeout,
      }));

    case states.paying:
      return emitter.emit('paying', {});

    default:
      return;
    }
  });

  sub.on('end', () => emitter.emit('end'));
  sub.on('error', err => emitter.emit('error', err));
  sub.on('status', n => emitter.emit('status', n));

  return emitter;
};
