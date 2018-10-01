const BN = require('bn.js');
const {isFinite} = require('lodash');

const {routesFromQueryRoutes} = require('./../lnd');

const defaultFinalCltvDelta = 144;
const defaultRoutesReturnCount = 10;
const intBase = 10;
const msatsPerToken = 1e3;

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
    [fee]: <Maximum Fee Tokens Number>
    [limit]: <Limit Results Count Number>
    lnd: <LND GRPC API Object>
    [timeout]: <Final CLTV Timeout Blocks Delta Number>
    tokens: <Tokens to Send Number>
  }

  @returns via cbk
  {
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      mtokens: <Total Millitokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Tokens Number>
      hops: [{
        channel_capacity: <Channel Capacity Tokens Number>
        channel_id: <BOLT 07 Encoded Channel Id String>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        timeout: <Timeout Block Height Number>
      }]
    }]
  }
*/
module.exports = ({destination, fee, limit, lnd, timeout, tokens}, cbk) => {
  if (!destination) {
    return cbk([400, 'ExpectedDestination']);
  }

  if (!lnd || !lnd.queryRoutes) {
    return cbk([400, 'ExpectedLndForGetRoutesRequest']);
  }

  if (!tokens) {
    return cbk([400, 'ExpectedTokensForRoutesQuery']);
  }

  return lnd.queryRoutes({
    amt: tokens,
    fee_limit: !fee ? undefined : {fee_limit: fee},
    final_cltv_delta: timeout || defaultFinalCltvDelta,
    num_routes: limit || defaultRoutesReturnCount,
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

    try {
      return cbk(null, routesFromQueryRoutes({response: res}));
    } catch (err) {
      return cbk([503, 'InvalidGetRoutesResponse', err]);
    }
  });
};

