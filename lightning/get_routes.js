const BN = require('bn.js');
const {isFinite} = require('lodash');

const {routesFromQueryRoutes} = require('./../lnd');

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
    lnd: <LND GRPC API Object>
    tokens: <Tokens to Send Number>
  }

  @returns via cbk
  {
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee MilliTokens String>
      mtokens: <Total MilliTokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Tokens Number>
      hops: [{
        channel_id: <Unique Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee MilliTokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward MilliTokens String>
        timeout: <Timeout Block Height Number>
      }]
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

    try {
      return cbk(null, routesFromQueryRoutes({response: res}));
    } catch (e) {
      return cbk([503, 'InvalidGetRoutesResponse', e]);
    }
  });
};

