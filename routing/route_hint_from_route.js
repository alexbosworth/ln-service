const {chanNumber} = require('bolt07');

const {isArray} = Array;

const firstHopOffset = 1;

/** Get a raw route hint from a route

  {
    route: [{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]
  }

  @throws
  <Error>

  @returns
  {
    hops: [{
      fee_base_msat: <Hop Base Fee Millitokens>
      fee_proportional_millionths: <Hop Fee Rate Number>
      chan_id: <Numeric Format Hop Channel Id String>
      cltv_expiry_delta: <Hop CLTV Delta Number>
      node_id: <Hop Public Key Hex String>
    }]
  }
*/
module.exports = ({route}) => {
  if (!isArray(route) || !route.length) {
    throw new Error('ExpectedRouteArrayToDeriveHints');
  }

  const hops = route.slice(firstHopOffset).map((hop, i) => {
    return {
      fee_base_msat: hop.base_fee_mtokens,
      fee_proportional_millionths: hop.fee_rate,
      chan_id: chanNumber({channel: hop.channel}).number,
      cltv_expiry_delta: hop.cltv_delta,
      node_id: route[i].public_key,
    };
  });

  return {hops};
};
