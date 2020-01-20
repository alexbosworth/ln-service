const asyncAuto = require('async/auto');
const {chanNumber} = require('bolt07');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const {blocksBuffer} = require('./constants');
const {defaultCltv} = require('./constants');
const {defaultTokens} = require('./constants');
const getWalletInfo = require('./../lightning/get_wallet_info');
const ignoreAsIgnoredNodes = require('./ignore_as_ignored_nodes');
const ignoreAsIgnoredPairs = require('./ignore_as_ignored_pairs');
const {pathNotFoundErrors} = require('./constants');
const routeHintFromRoute = require('./route_hint_from_route');
const routesFromQueryRoutes = require('./routes_from_query_routes');

const {concat} = Buffer;
const defaultMaxFee = Number.MAX_SAFE_INTEGER;
const dummyMppType = '5262155';
const {isArray} = Array;
const isPathNotFoundCode = code => !!pathNotFoundErrors[code];
const mtokensByteLength = 8;
const mtokensFromMpp = n => n.value.slice(64).padStart(16, 0);
const noRouteErrorDetails = 'unable to find a path to destination';
const paymentFromMppRecord = n => n.value.slice(0, 64);
const targetNotFoundError = 'target not found';
const tokensAsMtokens = n => (BigInt(n) * BigInt(1e3)).toString();
const trimByte = 0;

/** Get a route to a destination.

  Call this iteratively after failed route attempts to get new routes

  Do not use this method on LND 0.8.2 and below

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Final Send Destination Hex Encoded Public Key String>
    [features]: [{
      bit: <Feature Bit Number>
    }]
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [is_ignoring_past_failures]: <Ignore Past Failures Bool>
    lnd: <Authenticated LND gRPC API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens String>
    [max_timeout_height]: <Max CLTV Timeout Number>
    [messages]: [{
      type: <Message To Final Destination Type Number String>
      value: <Message To Final Destination Raw Value Hex Encoded String>
    }]
    [mtokens]: <Tokens to Send String>
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
    [tokens]: <Tokens Number>
    [total_mtokens]: <Total Millitokens of Shards String>
  }

  @returns via cbk or Promise
  {
    [route]: {
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
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Fee-Inclusive Millitokens String>
      [payment]: <Payment Identifier Hex String>
      safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      timeout: <Route Timeout Height Number>
      tokens: <Total Fee-Inclusive Tokens Number>
      [total_mtokens]: <Total Millitokens String>
    }
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.destination || !isHex(args.destination)) {
          return cbk([400, 'ExpectedDestinationKeyToGetRouteToDestination']);
        }

        if (!!args.total_mtokens && !args.payment) {
          return cbk([400, 'ExpectedTotalMtokensWithPaymentIdentifier']);
        }

        return cbk();
      },

      // Derive the amount in millitokens
      amountMillitokens: ['validate', ({}, cbk) => {
        // Exit early with an error when there is no amount specified
        if (!args.mtokens && args.tokens === undefined) {
          return cbk(null, tokensAsMtokens(defaultTokens));
        }

        // Exit early when there is only tokens set
        if (!args.mtokens) {
          return cbk(null, tokensAsMtokens(args.tokens));
        }

        // Exit early when there is only mtokens set
        if (args.tokens === undefined) {
          return cbk(null, args.mtokens);
        }

        // Exit early when the mtokens and tokens don't agree
        if (args.mtokens !== tokensAsMtokens(args.tokens)) {
          return cbk([400, 'ExpectedEqualValuesForTokensAndMtokens']);
        }

        return cbk(null, args.mtokens);
      }],

      // Get destination messages
      destinationCustomRecords: ['validate', ({}, cbk) => {
        const destTlv = (args.messages || []).reduce((tlv, n) => {
          tlv[n.type] = Buffer.from(n.value, 'hex');

          return tlv;
        },
        {});

        // Exit early when there is no payment identifier
        if (!args.payment) {
          return cbk(null, destTlv);
        }

        const payment = Buffer.from(args.payment, 'hex');

        // A dummy MPP record is set to simulate the size of the real record

        // Exit early when there is no total mtokens
        if (!args.total_mtokens) {
          destTlv[dummyMppType] = payment;

          return cbk(null, destTlv);
        }

        const mtokens = Buffer.alloc(mtokensByteLength);

        mtokens.writeBigUInt64BE(BigInt(args.total_mtokens));

        const trimIndex = mtokens.lastIndexOf(trimByte) + [trimByte].length;

        destTlv[dummyMppType] = concat([payment, mtokens.slice(trimIndex)]);

        return cbk(null, destTlv);
      }],

      // Final hop expected features
      destinationFeatures: ['validate', ({}, cbk) => {
        // Exit early when there are no features specified
        if (!args.features) {
          return cbk();
        }

        return cbk(null, args.features.map(({bit}) => bit));
      }],

      // Get the CLTV limit
      getCltvLimit: ['validate', ({}, cbk) => {
        if (!args.max_timeout_height) {
          return cbk();
        }

        return getWalletInfo({lnd: args.lnd}, (err, res) => {
          if (!!err) {
            return cbk(err);
          }

          return cbk(null, args.max_timeout_height - res.current_block_height);
        });
      }],

      // Determine the fee limit
      feeLimitMillitokens: ['validate', ({}, cbk) => {
        // Exit early when there is no fee specified
        if (!args.max_fee_mtokens && args.max_fee === undefined) {
          return cbk(null, tokensAsMtokens(defaultMaxFee));
        }

        // Exit early when there is only max fee set
        if (!args.max_fee_mtokens) {
          return cbk(null, tokensAsMtokens(args.max_fee));
        }

        // Exit early when there is only max fee mtokens set
        if (args.max_fee === undefined) {
          return cbk(null, args.max_fee_mtokens);
        }

        // Exit early when the mtokens and tokens don't agree
        if (tokensAsMtokens(args.max_fee) !== args.max_fee_mtokens) {
          return cbk([400, 'ExpectedEqualValuesForMaxFeeMtokensAndTokens']);
        }

        return cbk(null, args.max_fee_mtokens);
      }],

      // Determine the outgoing channel
      outgoingChannel: ['validate', ({}, cbk) => {
        if (!args.outgoing_channel) {
          return cbk();
        }

        return cbk(null, chanNumber({channel}).number);
      }],

      // Derive hop hints in RPC format
      routeHints: ['validate', ({}, cbk) => {
        if (!args.routes || !args.routes.length) {
          return cbk();
        }

        const hints = args.routes.map(route => {
          return {hop_hints: routeHintFromRoute({route}).hops}
        });

        return cbk(null, hints);
      }],

      // Execute query
      query: [
        'amountMillitokens',
        'destinationCustomRecords',
        'destinationFeatures',
        'feeLimitMillitokens',
        'getCltvLimit',
        'outgoingChannel',
        'routeHints',
        ({
          amountMillitokens,
          destinationCustomRecords,
          destinationFeatures,
          feeLimitMillitokens,
          getCltvLimit,
          outgoingChannel,
          routeHints,
        },
        cbk) =>
      {
        const {ignore} = args;

        return args.lnd.default.queryRoutes({
          amt_msat: amountMillitokens,
          cltv_limit: getCltvLimit,
          dest_custom_records: destinationCustomRecords || undefined,
          dest_features: destinationFeatures || undefined,
          fee_limit: {fixed_msat: feeLimitMillitokens},
          final_cltv_delta: (args.cltv_delta || defaultCltv) + blocksBuffer,
          ignored_nodes: ignoreAsIgnoredNodes({ignore}).ignored || undefined,
          ignored_pairs: ignoreAsIgnoredPairs({ignore}).ignored || undefined,
          last_hop_pubkey: args.incoming_peer || undefined,
          outgoing_chan_id: outgoingChannel || undefined,
          pub_key: args.destination,
          route_hints: routeHints || undefined,
          source_pub_key: args.start || undefined,
          use_mission_control: !args.is_ignoring_past_failures,
        },
        (err, response) => {
          if (!!err && err.details === targetNotFoundError) {
            return cbk([503, 'TargetNotFoundError']);
          }

          // Exit early when an error indicates that no routes are possible
          if (!!err && err.details === noRouteErrorDetails) {
            return cbk(null, {response: {routes: []}});
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrGettingRouteToDestination', {err}]);
          }

          return cbk(null, {response});
        });
      }],

      // Derived routes from query routes response
      routes: ['query', ({query}, cbk) => {
        // Exit early when there are no routes
        if (!query.response.routes.length) {
          return cbk(null, query.response.routes);
        }

        try {
          const {routes} = routesFromQueryRoutes({response: query.response});

          return cbk(null, routes);
        } catch (err) {
          return cbk([503, 'UnexpectedResultFromQueryRoutes', {err}]);
        }
      }],

      // Final route result
      route: ['routes', ({routes}, cbk) => {
        const [route] = routes;

        // Exit early when there is no route to the destination
        if (!route) {
          return cbk(null, {});
        }

        const {messages} = route;

        const dummyMppRecord = messages.find(n => n.type === dummyMppType);

        // Exit early when there is no dummy MPP record
        if (!dummyMppRecord) {
          return cbk(null, {route});
        }

        route.messages = messages.filter(n => n.type !== dummyMppType);
        route.payment = paymentFromMppRecord(dummyMppRecord);

        const mtokens = Buffer.from(mtokensFromMpp(dummyMppRecord), 'hex');

        route.total_mtokens = mtokens.readBigInt64BE().toString();

        return cbk(null, {route});
      }],
    },
    returnResult({reject, resolve, of: 'route'}, cbk));
  });
};
