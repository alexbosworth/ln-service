const hopsFromChannels = require('./hops_from_channels');
const routeFromHops = require('./route_from_hops');

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
        fee_rate: <Fees Charged Per Million Tokens Number>
        is_disabled: <Channel Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
    }]
    [cltv]: <Final CLTV Delta Number>
    [destination]: <Destination Public Key Hex String>
    height: <Current Block Height Number>
    mtokens: <Millitokens To Send String>
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
      mtokens: <Total Fee-Inclusive Millitokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }
  }
*/
module.exports = ({channels, cltv, destination, height, mtokens}) => {
  if (!isArray(channels) || !channels.length) {
    throw new Error('ExpectedChannelsToFormRouteToDestination');
  }

  if (!channels.slice().pop().destination && !destination) {
    throw new Error('ExpectedDestinationForRouteToDestination');
  }

  if (!height) {
    throw new Error('ExpectedHeightToCalculateRouteToDestination');
  }

  if (!mtokens) {
    throw new Error('ExpectedMillitokensToSendOnRouteToDestination');
  }

  const {hops} = hopsFromChannels({channels, destination});

  return {route: routeFromHops({cltv, height, hops, mtokens})};
};
