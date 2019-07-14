const {createHash} = require('crypto');
const EventEmitter = require('events');

const {chanFormat} = require('bolt07');
const isHex = require('is-hex');

const {states} = require('./payment_states');

const decBase = 10;
const hexToBuf = hex => Buffer.from(hex, 'hex');
const sha256 = preimage => createHash('sha256').update(preimage).digest();

/** Subscribe to the status of a past payment

  Requires lnd built with routerrpc build tag

  Either a request or a destination, id, and tokens amount is required

  {
    [id]: <Payment Request Hash Hex String>
    lnd: <Authenticated Lnd gRPC API Object>
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

  @event 'paying'
  {}
*/
module.exports = args => {
  if (!args.id || !isHex(args.id)) {
    throw new Error('ExpectedIdOfPastPaymentToSubscribeTo');
  }

  if (!args.lnd || !args.lnd.router) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToPastPaymentStatus');
  }

  const emitter = new EventEmitter();
  const sub = args.lnd.router.trackPayment({payment_hash: hexToBuf(args.id)});

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
