const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {returnResult} = require('asyncjs-util');

const {blocksBuffer} = require('./constants');
const {defaultCltv} = require('./constants');
const {defaultTokens} = require('./constants');
const ignoreAsIgnoredEdges = require('./ignore_as_ignored_edges');
const ignoreAsIgnoredNodes = require('./ignore_as_ignored_nodes');
const {pathNotFoundErrors} = require('./constants');
const routesFromQueryRoutes = require('./routes_from_query_routes');

const {isArray} = Array;
const isPathNotFoundCode = code => !!pathNotFoundErrors[code];

/** Query for routes

  {
    [destination]: <Destination Public Key Hex String>
    [ignores]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [is_adjusted_for_past_failures]: <Routes are Failures-Adjusted Bool>
    [is_strict_hints]: <Only Route Through Specified Routes Paths Bool>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [outgoing_channel]: <Outgoing Channel Id String>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [cltv_delta]: <CLTV Delta Blocks Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [start_public_key]: <Start Query at Public Key Hex String>
    [tokens]: <Tokens to Send Number>
  }

  @returns via cbk or Promise
  {
    results: [{
      [extended]: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
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
    }]
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.destination && !args.routes) {
          return cbk([400, 'ExpectedDestinationOrRoutesToQueryRoutes']);
        }

        if (!args.lnd) {
          return cbk([400, 'ExpectedAuthenticatedLndToQueryRoutes']);
        }

        return cbk();
      },

      // Assemble routes to destination
      routesToDestination: ['validate', ({}, cbk) => {
        const hasRoutes = !!args.routes && !!args.routes.length;
        const strict = !!args.is_strict_hints;
        const stubDestination = [[{public_key: args.destination}]];

        // When an outgoing source is specified, avoid ignoring that source
        const ignore = (args.ignores || []).filter(edge => {
          if (!args.outgoing_channel || !!edge.channel) {
            return true;
          }

          // Don't ignore the outgoing node
          return edge.to_public_key !== args.start_public_key;
        });

        // Ignore straight paths to destination when strict hints is specified
        const destination = !args.destination || strict ? [] : stubDestination;

        // Routes are additive, so hop hints combine with a straight path
        const collectivePaths = [].concat(args.routes).concat(destination);

        return cbk(null, {
          ignore,
          routes: !hasRoutes ? destination : collectivePaths
        });
      }],

      // Execute the query for routes
      query: ['routesToDestination', ({routesToDestination}, cbk) => {
        return asyncMap(routesToDestination.routes, (route, cbk) => {
          if (!isArray(route)) {
            return cbk([400, 'ExpectedArrayOfExtendedHopsWhenQueryingRoutes']);
          }

          const extended = route.slice([args.destination].length);
          const [firstHop] = route;
          const {ignore} = routesToDestination;

          // A destination is required
          if (!firstHop.public_key) {
            return cbk([400, 'ExpectedPublicKeyInExtendedRoute']);
          }

          // Exit early when a full path is specified
          if (!!firstHop.channel) {
            return cbk(null, {extended, routes: []});
          }

          return args.lnd.default.queryRoutes({
            amt: args.tokens || defaultTokens,
            fee_limit: !args.max_fee ? undefined : {fee_limit: args.max_fee},
            final_cltv_delta: (args.cltv_delta || defaultCltv) + blocksBuffer,
            ignored_edges: ignoreAsIgnoredEdges({ignore}).ignored,
            ignored_nodes: ignoreAsIgnoredNodes({ignore}).ignored,
            pub_key: firstHop.public_key,
            source_pub_key: args.start_public_key,
            use_mission_control: args.is_adjusted_for_past_failures,
          },
          (err, response) => {
            // Exit early when an error indicates that no routes are possible
            if (!!err && isPathNotFoundCode(err.code)) {
              return cbk(null, {routes: []});
            }

            if (!!err) {
              return cbk([503, 'UnexpectedQueryRoutesError', {err}]);
            }

            try {
              const {routes} = routesFromQueryRoutes({response});

              return cbk(null, {extended, routes});
            } catch (err) {
              return cbk([503, 'InvalidGetRoutesResponse', {err}]);
            }
          });
        },
        cbk);
      }],

      // Assemble final routes
      result: ['query', ({query}, cbk) => cbk(null, {results: query})],
    },
    returnResult({reject, resolve, of: 'result'}, cbk));
  });
};
