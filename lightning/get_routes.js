const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncMapSeries = require('async/mapSeries');
const {flatten} = require('lodash');
const {isFinite} = require('lodash');

const getChannel = require('./get_channel');
const getWalletInfo = require('./get_wallet_info');
const {hopsFromChannels} = require('./../routing');
const {ignoreAsIgnoredEdges} = require('./../routing');
const {ignoreAsIgnoredNodes} = require('./../routing');
const {returnResult} = require('./../async-util');
const {routeFromHops} = require('./../routing');
const {routesFromQueryRoutes} = require('./../routing');

const defaultFinalCltvDelta = 40;
const defaultTokens = 0;
const isArray = Array;
const mtokBuffer = '000';
const notFoundCode = 404;

const pathNotFoundErrors = [
  'noPathFound',
  'noRouteFound',
  'insufficientCapacity',
  'maxHopsExceeded',
  'targetNotInNetwork',
];

/** Get routes a payment can travel towards a destination

  When paying to a private route, make sure to pass the final destination in
  addition to routes.

  {
    [destination]: <Final Send Destination Hex Encoded Public Key String>
    [fee]: <Maximum Fee Tokens Number>
    [get_channel]: <Custom Get Channel Function>
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    lnd: <LND GRPC API Object>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [start]: <Starting Node Public Key Hex String>
    [timeout]: <Final CLTV Delta Number>
    [tokens]: <Tokens to Send Number>
  }

  @returns via cbk
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
        public_key: <Forward Edge Public Key Hex String>
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

      if (!!args.ignore) {
        try {
          ignoreAsIgnoredEdges({ignore: args.ignore});
        } catch (err) {
          return cbk([400, 'ExpectedValidIgnoreEdges', err]);
        }
      }

      if (!args.lnd || !args.lnd.queryRoutes) {
        return cbk([400, 'ExpectedLndForGetRoutesRequest']);
      }

      if (!!args.routes && !isArray(args.routes)) {
        return cbk([400, 'ExpectedArrayOfRoutesForRouteQuery']);
      }

      if (!!args.routes && !!args.start) {
        return cbk([400, 'ExpectedNoRoutesSetWhenSpecifyingStartingPubKey']);
      }

      return cbk();
    },

    // Derive routes
    getRoutes: ['validate', ({}, cbk) => {
      const routes = args.routes || [[{public_key: args.destination}]];

      return asyncMap(routes, (route, cbk) => {
        const extended = route.slice([args.destination].length);
        const [firstHop] = route;

        if (!firstHop.public_key) {
          return cbk([400, 'ExpectedPublicKeyInExtendedRoute']);
        }

        if (extended.length > [args.destination].length) {
          return cbk([400, 'ExpectedOnlyLastHopRouteExtension']);
        }

        if (!!firstHop.channel) {
          return cbk(null, {extended, routes: []});
        }

        return args.lnd.queryRoutes({
          amt: args.tokens || defaultTokens,
          fee_limit: !args.fee ? undefined : {fee_limit: args.fee},
          final_cltv_delta: args.timeout || defaultFinalCltvDelta,
          ignored_edges: ignoreAsIgnoredEdges({ignore: args.ignore}).ignored,
          ignored_nodes: ignoreAsIgnoredNodes({ignore: args.ignore}).ignored,
          pub_key: firstHop.public_key,
          source_pub_key: args.start || undefined,
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

            return cbk(null, {extended, routes});
          } catch (err) {
            return cbk([503, 'InvalidGetRoutesResponse', err]);
          }
        });
      },
      cbk);
    }],

    // Get the current block height if necessary for route assembly
    getWallet: ['getRoutes', ({}, cbk) => {
      if (!args.routes) {
        return cbk();
      }

      return getWalletInfo({lnd: args.lnd}, cbk);
    }],

    // Assemble the final routes
    assemble: ['getRoutes', 'getWallet', ({getRoutes, getWallet}, cbk) => {
      // Exit early when no extended routes are specified
      if (!args.routes) {
        const [standardRoute] = getRoutes;

        return cbk(null, standardRoute.routes);
      }

      const channels = {};
      const [firstRoute] = args.routes;
      const gotChannels = {};
      let pkCursor;
      const source = getWallet.public_key;

      const [finalHop] = firstRoute.slice().reverse();

      args.routes.forEach(route => {
        return route.forEach(n => {
          if (!n.channel) {
            return;
          }

          channels[n.channel] = {
            capacity: args.tokens,
            id: n.channel,
            policies: [
              {
                base_fee_mtokens: n.base_fee_mtokens,
                fee_rate: n.fee_rate,
                public_key: pkCursor,
              },
              {
                cltv_delta: n.cltv_delta,
                public_key: n.public_key,
              },
            ],
          };

          pkCursor = n.public_key;

          return;
        });
      });

      return asyncMapSeries(getRoutes, ({extended, routes}, cbk) => {
        if (!routes.length) {
          return cbk(null, []);
        }

        const extendedHops = extended.map(hop => {
          return {channel: hop.channel, destination: hop.public_key};
        });

        const baseRoutes = routes.map(({hops}) => {
          return hops.map(hop => {
            return {channel: hop.channel, destination: hop.public_key};
          });
        });

        return asyncMapSeries(baseRoutes, (baseHops, cbk) => {
          return asyncMapSeries(baseHops.concat(extendedHops), (hop, cbk) => {
            const id = hop.channel;

            // Exit early when channel information is cached
            if (!!gotChannels[id]) {
              const knownChannel = gotChannels[id];

              return cbk(null, {
                id,
                capacity: knownChannel.capacity,
                destination: hop.destination,
                policies: knownChannel.policies,
              });
            }

            const getChan = args.get_channel || getChannel;

            return getChan({id, lnd: args.lnd}, (err, channel) => {
              const [errCode] = err || [];

              // Exit early when the channel is known outside the graph
              if (!!err && errCode === notFoundCode && !!channels[id]) {
                return cbk(null, {
                  id,
                  capacity: channels[id].capacity,
                  destination: hop.destination,
                  policies: channels[id].policies,
                });
              }

              if (!!err) {
                return cbk(err);
              }

              const chan = {
                id,
                capacity: channel.capacity,
                policies: channel.policies,
              };

              gotChannels[id] = chan;

              return cbk(null, {
                id,
                capacity: channel.capacity,
                destination: hop.destination,
                policies: channel.policies,
              });
            });
          },
          (err, channels) => {
            if (!!err) {
              return cbk(err);
            }

            const destination = args.destination;

            try {
              return cbk(null, routeFromHops({
                cltv: args.timeout || defaultFinalCltvDelta,
                height: getWallet.current_block_height,
                hops: hopsFromChannels({channels, destination}).hops,
                mtokens: `${args.tokens || defaultTokens}${mtokBuffer}`,
              }));
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
    assembledRoutes: ['assemble', ({assemble}, cbk) => {
      const routes = flatten(assemble).filter(route => {
        if (!!args.fee && route.fee > args.fee) {
          return false;
        }

        return true;
      });

      return cbk(null, {routes});
    }],
  },
  returnResult({of: 'assembledRoutes'}, cbk));
};
