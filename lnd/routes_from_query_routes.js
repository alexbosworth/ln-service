const BN = require('bn.js');

const decBase = 10;
const msatsPerToken = new BN(1e3, 10);

/** Routes from query routes GRPC response

  {
    response: {
      routes: [{
        hops: [{
          amt_to_forward: <Amount to Forward Tokens String>
          amt_to_forward_msat: <Amount to Forward Millitokens String>
          chan_capacity: <Channel Capacity Tokens String>
          chan_id: <BOLT 07 Channel Id String>
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
      timeout: <Timeout Block Height Number>
      mtokens: <Total Millitokens String>
      tokens: <Total Tokens Number>
      hops: [{
        channel_id: <BOLT 07 Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        timeout: <Timeout Block Height Number>
      }]
    }]
  }
*/
module.exports = ({response}) => {
  if (!response) {
    throw new Error('ExpectedResponse');
  }

  const {routes} = response;

  if (!Array.isArray(routes)) {
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

    if (!Array.isArray(route.hops)) {
      return true;
    }

    return false;
  });

  if (!!invalidRoute) {
    throw new Error('ExpectedValidRoutes');
  }

  return {
    routes: routes.map(route => {
      const totalFeesMsat = new BN(route.total_fees_msat, decBase);
      const totalAmtMsat = new BN(route.total_amt_msat, decBase);

      return {
        fee: totalFeesMsat.div(msatsPerToken).toNumber(),
        fee_mtokens: totalFeesMsat.toString(),
        hops: route.hops.map(h => {
          return {
            channel_capacity: new BN(h.chan_capacity, decBase).toNumber(),
            channel_id: h.chan_id,
            fee: new BN(h.fee, decBase).toNumber(),
            fee_mtokens: new BN(h.fee_msat, decBase).toString(),
            forward: new BN(h.amt_to_forward, decBase).toNumber(),
            forward_mtokens: new BN(h.amt_to_forward_msat, decBase).toString(),
            timeout: h.expiry,
          };
        }),
        timeout: route.total_time_lock,
        tokens: totalAmtMsat.div(msatsPerToken).toNumber(),
        mtokens: totalAmtMsat.toString(),
      };
    }),
  };
};

