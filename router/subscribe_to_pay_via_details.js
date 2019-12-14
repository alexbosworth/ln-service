const {randomBytes} = require('crypto');

const subscribeToPay = require('./subscribe_to_pay');

const defaultCltvDelta = 40;
const randomId = () => randomBytes(32).toString('hex');

/** Subscribe to the flight of a payment

  Requires LND built with `routerrpc` build tag

  Specifying `max_fee_mtokens`/`mtokens` is not supported in LND 0.8.2 or below

  `incoming_peer` is not supported on LND 0.8.2 and below

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key String>
    [id]: <Payment Request Hash Hex String>
    [incoming_peer]: <Pay Through Specific Final Hop Public Key Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens To Pay Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [mtokens]: <Millitokens to Pay String>
    [outgoing_channel]: <Pay Out of Outgoing Channel Id String>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [tokens]: <Tokens to Pay Number>
  }

  @throws
  <Error>

  @returns
  <Subscription EventEmitter Object>

  @event 'confirmed'
  {
    fee: <Total Fees Paid Tokens Number>
    fee_mtokens: <Total Fee Millitokens Paid String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      fee_mtokens: <Fee Millitokens String>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Public Key Hex String>
      timeout: <Timeout Block Height Number>
    }]
    [id]: <Payment Hash Hex String>
    mtokens: <Total Millitokens Paid String>
    safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
    safe_tokens: <Payment Tokens Rounded Up Number>
    secret: <Payment Preimage Hex String>
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
    incoming_peer: args.incoming_peer,
    lnd: args.lnd,
    max_fee: args.max_fee,
    max_fee_mtokens: args.max_fee_mtokens,
    max_timeout_height: args.max_timeout_height,
    mtokens: args.mtokens,
    outgoing_channel: args.outgoing_channel,
    pathfinding_timeout: args.pathfinding_timeout,
    routes: args.routes,
    tokens: args.tokens,
  });
};
