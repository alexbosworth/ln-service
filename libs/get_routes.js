const _ = require('lodash');

const intBase = 10;

/** Get routes

  {
    destination: <Send Destination Hex Encoded Public Key String>
    lnd_grpc_api: <Object>
    tokens: <Tokens to Send Number>
  }

  @returns via cbk
  {
    routes: [{
      fee: <Route Fee Tokens Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) {
    return cbk([500, 'Missing lnd grpc api', args]);
  }

  if (!args.destination || !args.tokens) {
    return cbk([500, 'Expected destination, tokens', args]);
  }

  return args.lnd_grpc_api.queryRoutes({
    amt: args.tokens,
    pub_key: args.destination,
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    if (!res || !Array.isArray(res.routes)) {
      return cbk([500, 'Expected routes', res]);
    }

    const invalidRoutes = res.routes
      .map((route) => parseInt(route.total_fees, intBase))
      .filter((fees) => !_.isFinite(fees));

    if (!!invalidRoutes.length) {
      return cbk([500, 'Expected valid routes']);
    }

    const routes = res.routes.map((route) => {
      return {fee: parseInt(route.total_fees, intBase)};
    });

    return cbk(null, {routes});
  });
};

