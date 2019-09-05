const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncMapSeries = require('async/mapSeries');
const {flatten} = require('lodash');
const {returnResult} = require('asyncjs-util');

const getChannel = require('./get_channel');
const getWalletInfo = require('./get_wallet_info');
const {ignoreAsIgnoredEdges} = require('./../routing');
const {ignoreAsIgnoredNodes} = require('./../routing');
const {routeFromChannels} = require('./../routing');
const {routeFromHops} = require('./../routing');
const {routesFromQueryRoutes} = require('./../routing');

const blocksBuffer = 6;
const defaultFinalCltvDelta = 40;
const defaultTokens = 0;
const isArray = Array;
const mtokBuffer = '000';
const notFoundCode = 404;
const tokensAsMtokens = tokens => (BigInt(tokens) * BigInt(1000)).toString();

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

  `is_adjusted_for_past_failures` will turn on LND 0.7.1+ past-fail pathfinding

  {
    [cltv_delta]: <Final CLTV Delta Number>
    [destination]: <Final Send Destination Hex Encoded Public Key String>
    [get_channel]: <Custom Get Channel Function>
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [is_adjusted_for_past_failures]: <Routes are Failures-Adjusted Bool>
    [is_strict_hints]: <Only Route Through Specified Routes Paths Bool>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [outgoing_channel]: [Outgoing Channel Id String>]
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [cltv_delta]: <CLTV Delta Blocks Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    [start]: <Starting Node Public Key Hex String>
    [tokens]: <Tokens to Send Number>
  }

  @returns via cbk or Promise
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
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
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

        if (!args.lnd || !args.lnd.default || !args.lnd.default.queryRoutes) {
          return cbk([400, 'ExpectedLndForGetRoutesRequest']);
        }

        if (!!args.outgoing_channel && !!args.start) {
          return cbk([400, 'ExpectedEitherOutgoingChannelOrStartKeyNotBoth']);
        }

        if (!!args.routes && !isArray(args.routes)) {
          return cbk([400, 'ExpectedArrayOfRoutesForRouteQuery']);
        }

        if (!!args.routes && !!args.start) {
          return cbk([400, 'ExpectedNoRoutesSetWhenSpecifyingStartingPubKey']);
        }

        return cbk();
      },

      // Get ignored edges
      getIgnoredEdges: ['validate', ({}, cbk) => {
        return asyncMap(args.ignore || [], (ignore, cbk) => {
          // Exit early when there is no channel specified
          if (!ignore.channel) {
            return cbk(null, ignore);
          }

          // Exit early when this is a node ignore
          if (!ignore.from_public_key && !ignore.to_public_key) {
            return cbk(null, ignore);
          }

          // Exit early when this is a full edge ignore
          if (!!ignore.from_public_key && !!ignore.to_public_key) {
            return cbk(null, ignore);
          }

          return getChannel({
            id: ignore.channel,
            lnd: args.lnd,
          },
          (err, res) => {
            // Exit early when this channel is unknown
            if (!!err || !res || res.policies.length !== 2) {
              return cbk();
            }

            const fromKey = ignore.from_public_key;
            const toKey = ignore.to_public_key;

            const from = res.policies
              .find(n => n.public_key === fromKey || n.public_key !== toKey);

            const to = res.policies
              .find(n => n.public_key === toKey || n.public_key !== fromKey);

            return cbk(null, {
              channel: ignore.channel,
              from_public_key: from.public_key,
              to_public_key: to.public_key,
            });
          });
        },
        cbk);
      }],

      // Get the wallet public key
      getInfo: ['validate', ({}, cbk) => {
        // Wallet info is only necessary for outgoing channel construction
        if (!args.outgoing_channel) {
          return cbk();
        }

        return getWalletInfo({lnd: args.lnd}, cbk);
      }],

      // Get the source key
      getOutgoing: ['getInfo', ({getInfo}, cbk) => {
        // The source key can be set discretely
        if (!!args.start) {
          return cbk(null, {channels: [], source_key: args.start});
        }

        // Exit early when there is no outgoing restraint
        if (!args.outgoing_channel) {
          return cbk(null, {channels: [], source_key: undefined});
        }

        const sourceKey = getInfo.public_key;

        return getChannel({
          id: args.outgoing_channel,
          lnd: args.lnd,
        },
        (err, channel) => {
          if (!!err) {
            return cbk(err);
          }

          const peer = channel.policies.find(n => n.public_key !== sourceKey);

          channel.destination = peer.public_key;

          return cbk(null, {channels: [channel], source_key: peer.public_key});
        });
      }],

      // Derive routes
      getRoutes: [
        'getIgnoredEdges',
        'getOutgoing',
        ({getIgnoredEdges, getOutgoing}, cbk) =>
      {
        const stubDestination = [[{public_key: args.destination}]];
        const hasRoutes = !!args.routes && !!args.routes.length;
        const strict = !!args.is_strict_hints;

        const ignore = getIgnoredEdges
          .filter(n => !!n)
          .filter(edge => {
            if (!args.outgoing_channel || !!edge.channel) {
              return true;
            }

            // When specifying an outgoing source, don't ever ignore it
            return edge.to_public_key !== getOutgoing.source_key;
          });

        const destination = !args.destination || strict ? [] : stubDestination;

        const collectivePaths = [].concat(args.routes).concat(destination);

        const routesToDestination = !hasRoutes ? destination : collectivePaths;

        return asyncMap(routesToDestination, (route, cbk) => {
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

          const finalCltv = (args.cltv_delta || defaultFinalCltvDelta);

          return args.lnd.default.queryRoutes({
            amt: args.tokens || defaultTokens,
            fee_limit: !args.max_fee ? undefined : {fee_limit: args.max_fee},
            final_cltv_delta: finalCltv + blocksBuffer,
            ignored_edges: ignoreAsIgnoredEdges({ignore}).ignored,
            ignored_nodes: ignoreAsIgnoredNodes({ignore}).ignored,
            pub_key: firstHop.public_key,
            source_pub_key: getOutgoing.source_key,
            use_mission_control: args.is_adjusted_for_past_failures,
          },
          (err, response) => {
            // Exit early when an error indicates that no routes are possible
            if (!!err && !!err.code && !!pathNotFoundErrors[err.code]) {
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

      // Get the current block height if necessary for route assembly
      getWallet: ['getRoutes', ({}, cbk) => {
        if (!args.routes && !args.outgoing_channel) {
          return cbk();
        }

        return getWalletInfo({lnd: args.lnd}, cbk);
      }],

      // Assemble the final routes
      assemble: [
        'getOutgoing',
        'getRoutes',
        'getWallet',
        ({getOutgoing, getRoutes, getWallet}, cbk) =>
      {
        // Exit early when no route extensions are specified
        if (!args.routes && !args.outgoing_channel) {
          const [standardRoute] = getRoutes;

          return cbk(null, standardRoute.routes);
        }

        const channels = {};
        const gotChannels = {};
        let pkCursor;
        const source = getWallet.public_key;

        (args.routes || []).forEach(route => {
          return route.forEach((hop, i, hops) => {
            if (!hop.channel) {
              return;
            }

            const prevHop = hops[i - 1];

            channels[hop.channel] = {
              capacity: args.tokens,
              id: hop.channel,
              policies: [
                {
                  cltv_delta: hop.cltv_delta,
                  base_fee_mtokens: hop.base_fee_mtokens,
                  fee_rate: hop.fee_rate,
                  public_key: pkCursor || source,
                },
                {
                  base_fee_mtokens: hop.base_fee_mtokens,
                  cltv_delta: hop.cltv_delta,
                  fee_rate: hop.fee_rate,
                  public_key: !!prevHop ? prevHop.public_key : hop.public_key,
                },
              ],
            };

            pkCursor = hop.public_key;

            return;
          });
        });

        return asyncMapSeries(getRoutes, ({extended, routes}, cbk) => {
          if (!routes.length && !args.outgoing_channel) {
            return cbk(null, []);
          }

          const extendedHops = (extended || []).map(hop => {
            return {channel: hop.channel, destination: hop.public_key};
          });

          const baseRoutes = routes.map(({hops}) => {
            return hops.map(hop => {
              return {channel: hop.channel, destination: hop.public_key};
            });
          });

          return asyncMapSeries(baseRoutes, (baseHops, cbk) => {
            const completeHops = [].concat(baseHops).concat(extendedHops);

            return asyncMapSeries(completeHops, (hop, cbk) => {
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

              return getWalletInfo({lnd: args.lnd}, (err, res) => {
                if (!!err) {
                  return cbk(err);
                }

                try {
                  const {route} = routeFromChannels({
                    destination,
                    channels: [].concat(getOutgoing.channels).concat(channels),
                    cltv_delta: (args.cltv_delta || defaultFinalCltvDelta),
                    height: res.current_block_height,
                    mtokens: tokensAsMtokens(args.tokens || defaultTokens),
                  });

                  return cbk(null, route);
                } catch (err) {
                  return cbk([500, 'UnexpectedRouteFromChannelsErr', {err}]);
                }
              });
            });
          },
          cbk);
        },
        cbk);
      }],

      // Total routes
      assembledRoutes: ['assemble', ({assemble}, cbk) => {
        const routes = flatten(assemble).filter(route => {
          if (!!args.max_fee && route.fee > args.max_fee) {
            return false;
          }

          return true;
        });

        routes.sort((a, b) => a.fee < b.fee ? -1 : 1);

        return cbk(null, {routes});
      }],
    },
    returnResult({reject, resolve, of: 'assembledRoutes'}, cbk));
  });
};
