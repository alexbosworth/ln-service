const asyncAuto = require('async/auto');
const asyncTimeout = require('async/timeout');
const {returnResult} = require('asyncjs-util');
const {subscribeToProbeForRoute} = require('lightning/lnd_methods');

const defaultProbeTimeoutMs = 1000 * 60;
const {isArray} = Array;
const isHex = n => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const notImplemented = 501;

/** Probe to find a successful route

  Requires `offchain:write` permission

  {
    [cltv_delta]: <Final CLTV Delta Number>
    destination: <Destination Public Key Hex String>
    [features]: [{
      bit: <Feature Bit Number>
    }]
    [ignore]: [{
      [channel]: <Channel Id String>
      from_public_key: <Public Key Hex String>
      [to_public_key]: <To Public Key Hex String>
    }]
    [incoming_peer]: <Incoming Peer Public Key Hex String>
    [is_ignoring_past_failures]: <Adjust Probe For Past Routing Failures Bool>
    [is_strict_hints]: <Only Route Through Specified Paths Bool>
    lnd: <Authenticated LND API Object>
    [max_fee]: <Maximum Fee Tokens Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens to Pay String>
    [max_timeout_height]: <Maximum Height of Payment Timeout Number>
    [messages]: [{
      type: <Message To Final Destination Type Number String>
      value: <Message To Final Destination Raw Value Hex Encoded String>
    }]
    [mtokens]: <Millitokens to Pay String>
    [outgoing_channel]: <Outgoing Channel Id String>
    [path_timeout_ms]: <Time to Spend On A Path Milliseconds Number>
    [payment]: <Payment Identifier Hex String>
    [probe_timeout_ms]: <Probe Timeout Milliseconds Number>
    [routes]: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens Number>
      [channel_capacity]: <Channel Capacity Tokens Number>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    tokens: <Tokens Number>
    [total_mtokens]: <Total Millitokens Across Paths String>
  }

  @returns via cbk or Promise
  {
    [route]: {
      [confidence]: <Route Confidence Score Out Of One Million Number>
      fee: <Route Fee Tokens Rounded Down Number>
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
      timeout: <Timeout Block Height Number>
      tokens: <Total Fee-Inclusive Tokens Rounded Down Number>
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
          return cbk([400, 'ExpectedDestinationKeyHexStringForRouteProbe']);
        }

        if (!!args.ignore && !isArray(args.ignore)) {
          return cbk([400, 'ExpectedIgnoreAsArrayWhenProbingForRoute'])
        }

        if (!args.lnd || !args.lnd.router) {
          return cbk([400, 'ExpectedAuthenticatedLndToProbeForRoute']);
        }

        if (!args.mtokens && !args.tokens) {
          return cbk([400, 'ExpectedTokensValueToProbeForRoute']);
        }

        return cbk();
      },

      // Start probe and return a successful route if found
      probe: ['validate', ({}, cbk) => {
        const result = {};
        let isFinished = false;
        let timeout;

        const sub = subscribeToProbeForRoute({
          cltv_delta: args.cltv_delta,
          destination: args.destination,
          features: args.features,
          ignore: args.ignore,
          incoming_peer: args.incoming_peer,
          is_ignoring_past_failures: args.is_ignoring_past_failures,
          is_strict_hints: args.is_strict_hints,
          lnd: args.lnd,
          max_fee: args.max_fee,
          max_fee_mtokens: args.max_fee_mtokens,
          max_timeout_height: args.max_timeout_height,
          messages: args.messages,
          mtokens: args.mtokens,
          outgoing_channel: args.outgoing_channel,
          path_timeout_ms: args.path_timeout_ms,
          payment: args.payment,
          routes: args.routes,
          tokens: args.tokens,
          total_mtokens: args.total_mtokens,
        });

        const finished = (err, res) => {
          sub.removeAllListeners();

          clearTimeout(timeout);

          return cbk(err, res);
        };

        timeout = setTimeout(
          () => finished([503, 'ProbeForRouteTimedOut']),
          args.probe_timeout_ms || defaultProbeTimeoutMs
        );

        sub.once('end', () => finished(null, {}));
        sub.once('error', err => finished(err));
        sub.once('probe_success', ({route}) => finished(null, {route}));

        return;
      }],
    },
    returnResult({reject, resolve, of: 'probe'}, cbk));
  });
};
