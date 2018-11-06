const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncMapSeries = require('async/mapSeries');
const BN = require('bn.js');
const {flatten} = require('lodash');
const {isFinite} = require('lodash');

const getChannel = require('./get_channel');
const getWalletInfo = require('./get_wallet_info');
const {hopsFromChannels} = require('./../routing');
const {returnResult} = require('./../async-util');
const {routeFromHops} = require('./../routing');
const {routesFromQueryRoutes} = require('./../routing');

const defaultFinalCltvDelta = 144;
const defaultRoutesReturnCount = 10;
const defaultTokens = 0;
const intBase = 10;
const msatsPerToken = 1e3;
const mtokBuffer = '000';

const pathNotFoundErrors = [
  'noPathFound',
  'noRouteFound',
  'insufficientCapacity',
  'maxHopsExceeded',
  'targetNotInNetwork',
];

/** Get routes a payment can travel towards a destination

  Either a destination or extended routes are required.

  {
    [destination]: <Send Destination Hex Encoded Public Key String>
    [fee]: <Maximum Fee Tokens Number>
    [limit]: <Limit Results Count Number>
    lnd: <LND GRPC API Object>
    [routes]: [[{
      base_fee_mtokens: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      channel_id: <Channel Id String>
      cltv_delta: <CLTV Blocks Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]]
    [timeout]: <Final CLTV Timeout Blocks Delta Number>
    [tokens]: <Tokens to Send Number>
  }

  @returns via cbk
  {
    routes: [{
      fee: <Route Fee Tokens Number>
      fee_mtokens: <Route Fee Millitokens String>
      hops: [{
        channel_id: <BOLT 07 Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        timeout: <Timeout Block Height Number>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.destination && !args.routes) {
        return cbk([400, 'ExpectedDestinationToFindRoutesTowards']);
      }

      if (!!args.destination && !!args.routes) {
        return cbk([400, 'ExpectedEitherDestinationOrRouteForRoutesQuery']);
      }

      if (!args.lnd || !args.lnd.queryRoutes) {
        return cbk([400, 'ExpectedLndForGetRoutesRequest']);
      }

      if (!!args.routes && !Array.isArray(args.routes)) {
        return cbk([400, 'ExpectedArrayOfRoutesForRouteQuery']);
      }

      return cbk();
    },

    // Determine what the wallet id is
    getWalletInfo: ['validate', ({}, cbk) => {
      return getWalletInfo({lnd: args.lnd}, cbk);
    }],

    // Sort out route destinations
    paths: ['getWalletInfo', ({getWalletInfo}, cbk) => {
      const routes = args.routes || [[{public_key: args.destination}]];

      const destinations = routes.map(route => {
        const [firstHop] = route;

        return {route, key: firstHop.public_key};
      });

      return asyncMap(routes, (route, cbk) => {
        const [firstHop] = route;

        if (!firstHop.channel_id) {
          return cbk(null, {route, key: firstHop.public_key});
        }

        const id = firstHop.channel_id;
        const key = firstHop.public_key;

        return getChannel({id, lnd: args.lnd}, (err, channel) => {
          if (!!err) {
            return cbk(err);
          }

          const peers = channel.policies.map(n => n.public_key);

          firstHop.is_full = !!peers.find(n => n === getWalletInfo.public_key);

          return cbk(null, {key, route});
        });
      },
      (err, destinations) => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, {destinations, routes});
      });
    }],

    // Derive routes
    getRoutes: ['paths', ({paths}, cbk) => {
      const {destinations} = paths;
      const {routes} = paths;

      return asyncMap(destinations, ({key, route}, cbk) => {
        const [firstHop] = route;

        if (firstHop.is_full) {
          return cbk(null, {
            key,
            route: route.slice(1),
            routes: [{hops: [{channel_id: firstHop.channel_id}]}],
          });
        }

        return args.lnd.queryRoutes({
          amt: args.tokens || defaultTokens,
          fee_limit: !args.fee ? undefined : {fee_limit: args.fee},
          final_cltv_delta: args.timeout || defaultFinalCltvDelta,
          num_routes: args.limit || defaultRoutesReturnCount,
          pub_key: key,
        },
        (err, response) => {
          // Exit early when an error indicates that no routes are possible
          if (!!err && isFinite(err.code) && !!pathNotFoundErrors[err.code]) {
            return cbk(null, {routes: []});
          }

          if (!!err) {
            return cbk([503, 'UnexpectedQueryRoutesError', err]);
          }

          try {
            const {routes} = routesFromQueryRoutes({response});

            return cbk(null, {key, route, routes});
          } catch (err) {
            return cbk([503, 'InvalidGetRoutesResponse', err]);
          }
        });
      },
      cbk);
    }],

    // Current height
    height: ['validate', ({}, cbk) => {
      return getWalletInfo({lnd: args.lnd}, (err, res) => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, res.current_block_height);
      });
    }],

    // Derive routes
    assembleRoutes: ['getRoutes', 'height', ({getRoutes, height}, cbk) => {
      if (!args.routes) {
        const [path] = getRoutes;

        return cbk(null, path.routes);
      }

      return asyncMap(getRoutes, ({key, route, routes}, cbk) => {
        const hops = routes.map(({hops}) => hops.map(hop => hop.channel_id));

        return asyncMap(hops, (ids, cbk) => {
          return asyncMapSeries(ids, (id, cbk) => {
            return getChannel({id, lnd: args.lnd}, (err, channel) => {
              if (!!err) {
                return cbk(err);
              }

              return cbk(null, {id,
                capacity: channel.capacity,
                policies: channel.policies,
              });
            });
          },
          (err, channels) => {
            if (!!err) {
              return cbk(err);
            }

            try {
              const {hops} = hopsFromChannels({channels, destination: key});

              const finalRoute = routeFromHops({
                height,
                hops: [].concat(hops).concat(route),
                mtokens: `${args.tokens || defaultTokens}${mtokBuffer}`,
              });

              return cbk(null, finalRoute);
            } catch (err) {
              return cbk([500, 'UnexpectedHopsFromChannelsError', err]);
            }
          });
        },
        cbk);
      },
      cbk);
    }],

    // Total routes
    assembledRoutes: ['assembleRoutes', ({assembleRoutes}, cbk) => {
      return cbk(null, {routes: flatten(assembleRoutes)});
    }],
  },
  returnResult({of: 'assembledRoutes'}, cbk));
};

