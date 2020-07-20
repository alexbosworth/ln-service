const hopsFromChannels = require('./hops_from_channels');
const routeFromHops = require('./route_from_hops');

const defaultInitialCltvDelta = 144;
const {isArray} = Array;

/** Get a route from a sequence of channels

  Either next hop destination in channels or final destination is required

  {
    channels: [{
      capacity: <Maximum Tokens Number>
      [destination]: <Next Node Public Key Hex String>
      id: <Standard Format Channel Id String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <Locktime Delta Number>
        fee_rate: <Fees Charged in Millitokens Per Million Number>
        is_disabled: <Channel Is Disabled Bool>
        max_htlc_mtokens: <Maximum HTLC Millitokens Value String>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
    }]
    [cltv_delta]: <Final CLTV Delta Number>
    [destination]: <Destination Public Key Hex String>
    height: <Current Block Height Number>
    [messages]: [{
      type: <Message Type Number String>
      value: <Message Raw Value Hex Encoded String>
    }]
    mtokens: <Millitokens To Send String>
    [payment]: <Payment Identification Value Hex String>
    [total_mtokens]: <Sum of Shards Millitokens String>
  }

  @throws
  <Error>

  @returns
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
        [public_key]: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      [payment]: <Payment Identification Value Hex String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
      [total_mtokens]: <Sum of Shards Millitokens String>
    }
  }
*/
module.exports = args => {
  if (!isArray(args.channels) || !args.channels.length) {
    throw new Error('ExpectedChannelsToFormRouteToDestination');
  }

  if (!args.channels.slice().pop().destination && !args.destination) {
    throw new Error('ExpectedDestinationForRouteToDestination');
  }

  if (!args.height) {
    throw new Error('ExpectedHeightToCalculateRouteToDestination');
  }

  if (!args.mtokens) {
    throw new Error('ExpectedMillitokensToSendOnRouteToDestination');
  }

  const path = hopsFromChannels({
    channels: args.channels,
    destination: args.destination,
  });

  const route = routeFromHops({
    cltv_delta: args.cltv_delta,
    height: args.height,
    hops: path.hops,
    initial_cltv: path.initial_cltv || defaultInitialCltvDelta,
    messages: args.messages,
    mtokens: args.mtokens,
    payment: args.payment,
    total_mtokens: args.total_mtokens,
  });

  return {route};
};
