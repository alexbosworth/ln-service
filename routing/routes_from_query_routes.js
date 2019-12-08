const {chanFormat} = require('bolt07');

const {safeTokens} = require('./../bolt00');

const decBase = 10;
const {isArray} = Array;
const mtokensPerToken = BigInt(1e3);
const millitokensToTokens = n => Number(BigInt(n) / BigInt(1e3));
const {round} = Math;
const successDenominator = 1e6;

/** Routes from raw lnd query routes gRPC response

  {
    response: {
      routes: [{
        hops: [{
          amt_to_forward_msat: <Amount to Forward Millitokens String>
          chan_capacity: <Channel Capacity Tokens String>
          chan_id: <Numeric Format Channel Id String>
          expiry: <Expiration Height Number>
          fee_msat: <Fee Millitokens String>
          pub_key: <Public Key Hex String>
        }]
        total_amt: <Total Tokens Number>
        total_amt_msat: <Route Total Millitokens String>
        total_fees: <Route Fee Tokens String>
        total_fees_msat: <Route Total Fees Millitokens String>
        total_time_lock: <Route Total Timelock Number>
      }]
      success_prob: <Success Probability Ratio Number>
    }
  }

  @throws
  <Error> on invalid response

  @returns
  {
    routes: [{
      [confidence]: <Confidence In Success Score Out Of One Million Number>
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      timeout: <Timeout Block Height Number>
      tokens: <Total Tokens Number>
    }]
  }
*/
module.exports = ({response}) => {
  if (!response) {
    throw new Error('ExpectedResponse');
  }

  const {routes} = response;

  const confidence = round(response.success_prob * successDenominator);

  if (!isArray(routes)) {
    throw new Error('ExpectedRoutes');
  }

  if (!routes.length) {
    throw new Error('ExpectedMultipleRoutes');
  }

  const invalidRoute = routes.find(route => {
    if (typeof route.total_fees_msat !== 'string') {
      return true;
    }

    if (typeof route.total_time_lock !== 'number') {
      return true;
    }

    if (!isArray(route.hops)) {
      return true;
    }

    return false;
  });

  if (!!invalidRoute) {
    throw new Error('ExpectedValidRoutes');
  }

  try {
    routes.forEach(route => {
      return route.hops.forEach(h => chanFormat({number: h.chan_id}));
    });
  } catch (err) {
    throw new Error('ExpectedValidHopChannelIdsInRoutes');
  }

  return {
    routes: routes.map(route => {
      const totalFeesMtok = BigInt(route.total_fees_msat);
      const totalAmtMtok = BigInt(route.total_amt_msat);

      return {
        confidence: confidence || undefined,
        fee: safeTokens({mtokens: route.total_fees_msat}).tokens,
        fee_mtokens: route.total_fees_msat,
        hops: route.hops.map(h => {
          return {
            channel: chanFormat({number: h.chan_id}).channel,
            channel_capacity: Number(h.chan_capacity),
            fee: safeTokens({mtokens: h.fee_msat}).tokens,
            fee_mtokens: h.fee_msat,
            forward: safeTokens({mtokens: h.amt_to_forward_msat}).tokens,
            forward_mtokens: h.amt_to_forward_msat,
            public_key: h.pub_key,
            timeout: h.expiry,
          };
        }),
        mtokens: route.total_amt_msat,
        safe_fee: safeTokens({mtokens: route.total_fees_msat}).safe,
        safe_tokens: safeTokens({mtokens: route.total_amt_msat}).safe,
        timeout: route.total_time_lock,
        tokens: safeTokens({mtokens: route.total_amt_msat}).tokens,
      };
    }),
  };
};
