const {isFinite} = require('lodash');

const defaultRoutesReturnCount = 10;
const intBase = 10;

const pathNotFoundErrors = [
  'noPathFound',
  'noRouteFound',
  'insufficientCapacity',
  'maxHopsExceeded',
  'targetNotInNetwork',
];

/** Get invoice payment routes

  {
    destination: <Send Destination Hex Encoded Public Key String>
    lnd: <LND GRPC API Object>
    tokens: <Tokens to Send Number>
  }

  @returns via cbk
  {
    routes: [{
      fee: <Route Fee Tokens Number>
    }]
  }
*/
module.exports = ({destination, lnd, tokens}, cbk) => {
  if (!destination) {
    return cbk([400, 'ExpectedDestination']);
  }

  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!tokens) {
    return cbk([400, 'ExpectedTokens']);
  }

  return lnd.queryRoutes({
    amt: tokens,
    num_routes: defaultRoutesReturnCount,
    pub_key: destination,
  },
  (err, res) => {
    // Exit early when an error indicates that no routes are possible
    if (!!err && isFinite(err.code) && !!pathNotFoundErrors[err.code]) {
      return cbk(null, {routes: []});
    }

    if (!!err) {
      return cbk([503, 'UnexpectedQueryRoutesError', err]);
    }

    if (!res || !Array.isArray(res.routes)) {
      return cbk([503, 'ExpectedRoutes']);
    }

    const invalidRoutes = res.routes
      .map(route => parseInt(route.total_fees, intBase))
      .filter(fees => !isFinite(fees));

    if (!!invalidRoutes.length) {
      return cbk([503, 'ExpectedValidRoutes']);
    }

    const routes = res.routes.map(route => {
      return {fee: parseInt(route.total_fees, intBase)};
    });

    return cbk(null, {routes});
  });
};

