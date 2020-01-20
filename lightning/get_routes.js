const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const asyncMapSeries = require('async/mapSeries');
const {flatten} = require('lodash');
const {returnResult} = require('asyncjs-util');
const {sortBy} = require('lodash');

const getChannel = require('./get_channel');
const {getIgnoredEdges} = require('./../routing');
const getWalletInfo = require('./get_wallet_info');
const {ignoreAsIgnoredEdges} = require('./../routing');
const {queryRoutes} = require('./../routing');
const {routeFromChannels} = require('./../routing');
const {safeTokens} = require('./../bolt00');

const defaultFinalCltvDelta = 40;
const defaultTokens = 0;
const {isArray} = Array;
const notFoundCode = 404;
const tokensAsMtokens = tokens => (BigInt(tokens) * BigInt(1000)).toString();

/** Get routes a payment can travel towards a destination

  When paying to a private route, make sure to pass the final destination in
  addition to routes.

  `is_adjusted_for_past_failures` will turn on past-fail adjusted pathfinding

  Setting both `start` and `outgoing_channel` is not supported

  `confidence` is not supported in LND 0.7.1
  `max_timeout_height` is not supported in LND 0.7.1

  Specifying `payment` identifier and `total_mtokens` isn't in LND 0.8.2, below

  On LND versions higher than 0.8.2, use getRouteToDestination instead

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
    [max_timeout_height]: <Max CLTV Timeout Number>
    [outgoing_channel]: <Outgoing Channel Id String>
    [payment]: <Payment Identifier Hex Strimng>
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
    [total_mtokens]: <Total Millitokens of Shards String>
  }

  @returns via cbk or Promise
  {
    routes: [{
      [confidence]: <Route Confidence Score Out Of One Million Number>
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
      [payment]: <Payment Identifier Hex String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
      [total_mtokens]: <Total Millitokens String>
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

      // Get ignored edges with filled in public keys if any are missing
      getIgnoredEdges: ['validate', ({}, cbk) => {
        return getIgnoredEdges({
          ignores: args.ignore || [],
          lnd: args.lnd,
        },
        cbk);
      }],

      // Get the wallet public key
      getInfo: ['validate', ({}, cbk) => getWalletInfo({lnd: args.lnd}, cbk)],

      // Get the source key for the outgoing channel constraint
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
        return queryRoutes({
          destination: args.destination,
          ignores: getIgnoredEdges.ignores,
          is_adjusted_for_past_failures: args.is_adjusted_for_past_failures,
          is_strict_hints: args.is_strict_hints,
          lnd: args.lnd,
          max_fee: args.max_fee,
          max_timeout_height: args.max_timeout_height,
          outgoing_channel: args.outgoing_channel,
          routes: args.routes,
          start_public_key: getOutgoing.source_key,
          tokens: args.tokens,
        },
        cbk);
      }],

      // Assemble the final routes
      assemble: [
        'getInfo',
        'getOutgoing',
        'getRoutes',
        ({getInfo, getOutgoing, getRoutes}, cbk) =>
      {
        // Exit early when no route extensions are specified
        if (!args.routes && !args.outgoing_channel) {
          const [standardRoute] = getRoutes.results;

          return cbk(null, standardRoute.routes);
        }

        const channels = {};
        const gotChannels = {};
        let pkCursor;
        const source = getInfo.public_key;

        (args.routes || []).forEach(route => {
          return route.forEach((hop, i, hops) => {
            if (!hop.channel) {
              return;
            }

            const prevHop = hops[i - [hop].length];

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

        return asyncMapSeries(getRoutes.results, ({extended, routes}, cbk) => {
          if (!routes.length && !args.outgoing_channel) {
            return cbk(null, []);
          }

          const extendedHops = (extended || []).map(hop => {
            return {channel: hop.channel, destination: hop.public_key};
          });

          const baseRoutes = routes.map(({confidence, hops}) => {
            return {
              confidence,
              baseHops: hops.map(hop => {
                return {channel: hop.channel, destination: hop.public_key};
              }),
            };
          });

          return asyncMapSeries(baseRoutes, ({baseHops, confidence}, cbk) => {
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
                    payment: args.payment,
                    total_mtokens: args.total_mtokens,
                  });

                  return cbk(null, {
                    confidence,
                    fee: route.fee,
                    fee_mtokens: route.fee_mtokens,
                    hops: route.hops,
                    mtokens: route.mtokens,
                    payment: route.payment,
                    safe_fee: safeTokens({mtokens: route.fee_mtokens}).safe,
                    safe_tokens: safeTokens({mtokens: route.mtokens}).safe,
                    timeout: route.timeout,
                    tokens: route.tokens,
                    total_mtokens: route.total_mtokens,
                  });
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

          const maxCltv = args.max_timeout_height;

          if (!!maxCltv && route.timeout > maxCltv) {
            return false;
          }

          return true;
        });

        return cbk(null, {routes: sortBy(routes, 'fee')});
      }],
    },
    returnResult({reject, resolve, of: 'assembledRoutes'}, cbk));
  });
};
