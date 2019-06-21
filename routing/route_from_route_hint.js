const {chanFormat} = require('bolt07');

const {isArray} = Array;

/** Get a route from lnd raw route hints

  {
    destination: <Destination Public Key Hex String>
    hop_hints: [{
      fee_base_msat: <Hop Base Fee Millitokens>
      channel: <Numeric Format Hop Channel Id String>
      cltv_delta: <Hop CLTV Delta Number>
      fee_rate: <Hop Fee Rate Number>
      node_id: <Hop Public Key Hex String>
    }]
  }

  @throws
  <ExpectedPaymentRequestDestinationToCalculateRoute Error>
  <ExpectedRouteHopBaseFeeInRouteHint Error>
  <ExpectedRouteHopChannelIdInRouteHint Error>
  <ExpectedRouteHopCltvExpiryDeltaInRouteHint Error>
  <ExpectedRouteHopFeeRateInRouteHint Error>
  <ExpectedRouteHopHints Error>
  <ExpectedRouteHopHintsInRoute Error>
  <ExpectedRouteHopPublicKeyInRouteHint Error>

  @returns
  [{
    [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
    [channel]: <Standard Format Channel Id String>
    [cltv_delta]: <CLTV Blocks Delta Number>
    [fee_rate]: <Fee Rate In Millitokens Per Million Number>
    public_key: <Forward Edge Public Key Hex String>
  }]
*/
module.exports = args => {
  if (!args.destination) {
    throw new Error('ExpectedPaymentRequestDestinationToCalculateRoute');
  }

  if (!isArray(args.hop_hints) || !args.hop_hints.length) {
    throw new Error('ExpectedRouteHopHints');
  }

  const [firstHint] = args.hop_hints;
  const lastHop = {node_id: args.destination};

  const lastHops = args.hop_hints.map((hop, i, hops) => {
    if (!hop.chan_id) {
      throw new Error('ExpectedRouteHopChannelIdInRouteHint');
    }

    if (hop.cltv_expiry_delta === undefined) {
      throw new Error('ExpectedRouteHopCltvExpiryDeltaInRouteHint');
    }

    if (hop.fee_base_msat === undefined) {
      throw new Error('ExpectedRouteHopBaseFeeInRouteHint');
    }

    if (hop.fee_proportional_millionths === undefined) {
      throw new Error('ExpectedRouteHopFeeRateInRouteHint');
    }

    if (!hop.node_id) {
      throw new Error('ExpectedRouteHopPublicKeyInRouteHint');
    }

    return {
      base_fee_mtokens: hop.fee_base_msat.toString(),
      channel: chanFormat({number: hop.chan_id}).channel,
      cltv_delta: hop.cltv_expiry_delta,
      fee_rate: hop.fee_proportional_millionths,
      public_key: (hops[(i + [hop].length)] || lastHop).node_id,
    };
  });

  return [].concat([{public_key: firstHint.node_id}]).concat(lastHops);
};
