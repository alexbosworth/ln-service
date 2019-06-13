const {randomBytes} = require('crypto');

const subscribeToPay = require('./subscribe_to_pay');

const defaultCltvDelta = 40;
const randomId = () => randomBytes(32).toString('hex');

/** Subscribe to the flight of a payment

  Requires lnd built with routerrpc build tag

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key String>
    [id]: <Payment Request Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
    tokens: <Tokens To Pay Number>
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
    [id]: <Payment Hash Hex String>
    mtokens: <Total Millitokens To Pay String>
    secret: <Payment Preimage Hex String>
  }

  @event 'failed'
  {
    is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
  }

  @event 'paying'
  {}
*/
module.exports = args => {
  if (!args.destination) {
    throw new Error('ExpectedDestinationWhenPayingViaDetails');
  }

  if (!args.lnd || !args.lnd.router) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToPayment');
  }

  if (!args.tokens && !args.request){
    throw new Error('ExpectedTokenAmountToPayWhenPaymentRequestNotSpecified');
  }

  return subscribeToPay({
    cltv_delta: args.cltv_delta || defaultCltvDelta,
    destination: args.destination,
    id: args.id || randomId(),
    lnd: args.lnd,
    max_fee: args.max_fee,
    outgoing_channel: args.outgoing_channel,
    pathfinding_timeout: args.pathfinding_timeout,
    timeout_height: args.timeout_height,
    tokens: args.tokens,
  });
};
