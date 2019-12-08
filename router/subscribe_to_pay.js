const {createHash} = require('crypto');
const EventEmitter = require('events');

const {chanFormat} = require('bolt07');
const {chanNumber} = require('bolt07');

const getWalletInfo = require('./../lightning/get_wallet_info');
const paymentAmounts = require('./payment_amounts');
const {routeHintFromRoute} = require('./../routing');
const {safeTokens} = require('./../bolt00');
const {states} = require('./payment_states');

const cltvBuf = 3;
const cltvLimit = (limit, height) => !limit ? undefined : limit - height;
const decBase = 10;
const defaultCltvDelta = 43;
const defaultTimeoutSeconds = 25;
const hexToBuf = hex => !hex ? undefined : Buffer.from(hex, 'hex');
const {isArray} = Array;
const maxTokens = '4294967296';
const msPerSec = 1000;
const mtokensPerToken = BigInt(1e3);
const {round} = Math;
const sha256 = preimage => createHash('sha256').update(preimage).digest();

/** Initiate and subscribe to the outcome of a payment

  LND built with `routerrpc` build tag is required

  Either a request or a destination, id, and tokens amount is required

  Failure due to invalid payment will only be registered on LND 0.7.1+

  Specifying `incoming_peer` is not supported on LND 0.8.1 and below

  {
    [cltv_delta]: <Final CLTV Delta Number>
    [destination]: <Destination Public Key String>
    [id]: <Payment Request Hash Hex String>
    [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [mtokens]: <Millitokens to Pay String>
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
    [tokens]: <Tokens to Probe Number>
  }

  @throws
  <Error>

  @returns
  <Subscription EventEmitter Object>

  @event 'confirmed'
  {
    fee: <Total Fee Tokens Paid Rounded Down Number>
    fee_mtokens: <Total Fee Millitokens Paid String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      fee: <Fee Tokens Rounded Down Number>
      fee_mtokens: <Fee Millitokens String>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Public Key Hex String>
      timeout: <Timeout Block Height Number>
    }]
    id: <Payment Hash Hex String>
    mtokens: <Total Millitokens Paid String>
    safe_fee: <Total Fee Tokens Paid Rounded Up Number>
    safe_tokens: <Total Tokens Paid, Rounded Up Number>
    secret: <Payment Preimage Hex String>
    timeout: <Expiration Block Height Number>
    tokens: <Total Tokens Paid Rounded Down Number>
  }

  @event 'failed'
  {
    is_invalid_payment: <Failed Due to Invalid Payment Bool>
    is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
    is_route_not_found: <Failed Due to Route Not Found Bool>
    [route]: {
      fee: <Route Total Fee Tokens Rounded Down Number>
      fee_mtokens: <Route Total Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Hop Forwarding Fee Rounded Down Tokens Number>
        fee_mtokens: <Hop Forwarding Fee Millitokens String>
        forward: <Hop Forwarding Tokens Rounded Down Number>
        forward_mtokens: <Hop Forwarding Millitokens String>
        public_key: <Hop Sending To Public Key Hex String>
        timeout: <Hop CTLV Expiration Height Number>
      }]
      mtokens: <Payment Sending Millitokens String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Sending Tokens Rounded Up Number>
      timeout: <Payment CLTV Expiration Height Number>
      tokens: <Payment Sending Tokens Rounded Down Number>
    }
  }

  @event 'paying'
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

  if (!args.mtokens && !args.tokens && !args.request){
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

  const amounts = paymentAmounts({
    max_fee: args.max_fee,
    max_fee_mtokens: args.max_fee_mtokens,
    mtokens: args.mtokens,
    request: args.request,
    tokens: args.tokens,
  });

  const emitter = new EventEmitter();
  const maxFee = args.max_fee !== undefined ? args.max_fee : maxTokens;
  const channel = !!args.outgoing_channel ? args.outgoing_channel : null;
  const routes = (args.routes || []);
  const timeoutSeconds = round((args.pathfinding_timeout || 0) / msPerSec);

  const hints = routes
    .map(route => ({hop_hints: routeHintFromRoute({route}).hops}));

  const finalCltv = !args.cltv_delta ? defaultCltvDelta : args.cltv_delta;

  (async () => {
    let maxCltvDelta;

    // Go get the block height when a max timeout height is specified
    if (!!args.max_timeout_height) {
      const blockchainInfo = await getWalletInfo({lnd: args.lnd});

      const currentHeight = blockchainInfo.current_block_height;

      maxCltvDelta = cltvLimit(args.max_timeout_height, currentHeight);
    }

    // The max cltv delta cannot be lower than the final cltv delta + buffer
    if (!!maxCltvDelta && !!finalCltv && maxCltvDelta < finalCltv + cltvBuf) {
      emitter.emit('err', new Error('MaxTimeoutHeightTooNearToPay'));

      emitter.emit('end');

      return;
    }

    const sub = args.lnd.router.sendPayment({
      allow_self_payment: true,
      amt: amounts.tokens,
      amt_msat: amounts.mtokens,
      cltv_limit: !!args.max_timeout_height ? maxCltvDelta : undefined,
      dest: !args.destination ? undefined : hexToBuf(args.destination),
      fee_limit_msat: amounts.max_fee_mtokens,
      fee_limit_sat: amounts.max_fee,
      final_cltv_delta: !args.request ? finalCltv : undefined,
      last_hop_pubkey: hexToBuf(args.incoming_peer),
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
          fee: safeTokens({mtokens: data.route.total_fees_msat}).tokens,
          fee_mtokens: data.route.total_fees_msat,
          hops: data.route.hops.map(hop => ({
            channel: chanFormat({number: hop.chan_id}).channel,
            channel_capacity: Number(hop.chan_capacity),
            fee: safeTokens({mtokens: hop.fee_msat}).tokens,
            fee_mtokens: hop.fee_msat,
            forward_mtokens: hop.amt_to_forward_msat,
            timeout: hop.expiry,
          })),
          id: sha256(data.preimage).toString('hex'),
          mtokens: data.route.total_amt_msat,
          safe_fee: safeTokens({mtokens: data.route.total_fees_msat}).safe,
          safe_tokens: safeTokens({mtokens: data.route.total_amt_msat}).safe,
          secret: data.preimage.toString('hex'),
          timeout: data.route.total_time_lock,
          tokens: safeTokens({mtokens: data.route.total_amt_msat}).tokens,
        });

      case states.errored:
      case states.invalid_payment:
      case states.pathfinding_routes_failed:
      case states.pathfinding_timeout_failed:
        return emitter.emit('failed', ({
          is_invalid_payment: data.state === states.invalid_payment,
          is_pathfinding_timeout: data.state === states.pathfinding_timeout,
          is_route_not_found: data.state === states.pathfinding_routes_failed,
          route: !data.route ? undefined : {
            fee: safeTokens({mtokens: data.route.total_fees_msat}).tokens,
            fee_mtokens: data.route.total_fees_msat,
            hops: data.route.hops.map(hop => ({
              channel: chanFormat({number: hop.chan_id}).channel,
              channel_capacity: Number(hop.chan_capacity),
              fee: safeTokens({mtokens: hop.fee_msat}).tokens,
              fee_mtokens: hop.fee_msat,
              forward: safeTokens({mtokens: hop.amt_to_forward_msat}).tokens,
              forward_mtokens: hop.amt_to_forward_msat,
              public_key: hop.pub_key,
              timeout: hop.expiry,
            })),
            mtokens: data.route.total_amt_msat,
            safe_fee: safeTokens({mtokens: data.route.total_fees_msat}).safe,
            safe_tokens: safeTokens({mtokens: data.route.total_amt_msat}).safe,
            timeout: data.route.total_time_lock,
            tokens: safeTokens({mtokens: data.route.total_amt_msat}).tokens,
          },
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
  })();

  return emitter;
};
