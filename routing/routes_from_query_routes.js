const {chanFormat} = require('bolt07');

const decBase = 10;
const {isArray} = Array;
const mtokensPerToken = BigInt(1e3);

/** Routes from raw lnd query routes gRPC response

  {
    response: {
      routes: [{
        hops: [{
          amt_to_forward: <Amount to Forward Tokens String>
          amt_to_forward_msat: <Amount to Forward Millitokens String>
          chan_capacity: <Channel Capacity Tokens String>
          chan_id: <Numeric Format Channel Id String>
          expiry: <Expiration Height Number>
          fee: <Fee Tokens String>
          fee_msat: <Fee Millitokens String>
        }]
        total_amt: <Total Tokens Number>
        total_amt_msat: <Route Total Millitokens String>
        total_fees: <Route Fee Tokens String>
        total_fees_msat: <Route Total Fees Millitokens String>
        total_time_lock: <Route Total Timelock Number>
      }]
    }
  }

  @throws
  <Error> on invalid response

  @returns
  {
    routes: [{
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
        fee: Number(totalFeesMtok / mtokensPerToken),
        fee_mtokens: route.total_fees_msat,
        hops: route.hops.map(h => {
          return {
            channel: chanFormat({number: h.chan_id}).channel,
            channel_capacity: parseInt(h.chan_capacity, decBase),
            fee: parseInt(h.fee, decBase),
            fee_mtokens: h.fee_msat,
            forward: parseInt(h.amt_to_forward, decBase),
            forward_mtokens: h.amt_to_forward_msat,
            public_key: h.pub_key,
            timeout: h.expiry,
          };
        }),
        mtokens: route.total_amt_msat,
        timeout: route.total_time_lock,
        tokens: Number(totalAmtMtok / mtokensPerToken),
      };
    }),
  };
};
