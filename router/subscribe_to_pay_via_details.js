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
    [max_timeout_height]: <Maximum Expiration CLTV Timeout Height Number>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
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
    is_invalid_payment: <Failed Due to Invalid Payment Bool>
    is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
    is_route_not_found: <Failed Due to Route Not Found Bool>
  }

  @event 'paying'
  {}
*/
module.exports = args => {
  if (!args.destination) {
    throw new Error('ExpectedDestinationWhenPayingViaDetails');
  }

  if (!args.lnd || !args.lnd.router) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToPayViaDetails');
  }

  if (!args.tokens && !args.request){
    throw new Error('ExpectedTokenAmountToPayInPaymentDetails');
  }

  return subscribeToPay({
    cltv_delta: args.cltv_delta || defaultCltvDelta,
    destination: args.destination,
    id: args.id || randomId(),
    lnd: args.lnd,
    max_fee: args.max_fee,
    max_timeout_height: args.max_timeout_height,
    outgoing_channel: args.outgoing_channel,
    pathfinding_timeout: args.pathfinding_timeout,
    routes: args.routes,
    tokens: args.tokens,
  });
};
