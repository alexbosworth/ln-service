const BN = require('bn.js');

const decBase = 10;
const msatsPerToken = new BN(1e3, 10);

/** Routes from query routes GRPC response

  {
    response: {
      routes: [{
        total_fees_msat: <Route Total Fees MSats String>
      }]
    }
  }

  @throws
  <Error> on invalid response

  @returns
  {
    routes: [{
      fee: <Route Fee Tokens Number>
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

    return false;
  });

  if (!!invalidRoute) {
    throw new Error('ExpectedValidRoutes');
  }

  return {
    routes: routes.map(route => {
      const totalFeesMsat = new BN(route.total_fees_msat, decBase);

      return {
        fee: totalFeesMsat.div(msatsPerToken).toNumber(),
        timeout: route.total_time_lock,
      };
    }),
  };
};

