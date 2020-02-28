const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const subscribeToPayViaRoutes = require('./subscribe_to_pay_via_routes');

const {isArray} = Array;
const isHash = n => /^[0-9A-F]{64}$/i.test(n);
const maxHopsCount = 20;

/** Make a payment via a specified route

  Requires LND built with `routerrpc` build tag

  If no id is specified, a random id will be used

  LND 0.8.2 and below do not support `messages`, `total_mtokens`, `payment`

  {
    [id]: <Payment Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    routes: [{
      fee: <Total Fee Tokens To Pay Number>
      fee_mtokens: <Total Fee Millitokens To Pay String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        [public_key]: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      [messages]: [{
        type: <Message Type Number String>
        value: <Message Raw Value Hex Encoded String>
      }]
      mtokens: <Total Millitokens To Pay String>
      [payment]: <Payment Identifier Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
      [total_mtokens]: <Total Millitokens String>
    }]
  }

  @returns via cbk or Promise
  {
    failures: [[
      <Failure Code Number>
      <Failure Code Message String>
      <Failure Code Details Object>
    ]]
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid Millitokens String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Hop Channel Capacity Tokens Number>
      fee_mtokens: <Hop Forward Fee Millitokens String>
      forward_mtokens: <Hop Forwarded Millitokens String>
      timeout: <Hop CLTV Expiry Block Height Number>
    }]
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <Total Millitokens Sent String>
    safe_fee: <Payment Forwarding Fee Rounded Up Tokens Number>
    safe_tokens: <Payment Tokens Rounded Up Number>
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Rounded Down Number>
  }

  @returns error via cbk or Promise
  [
    <Error Classification Code Number>
    <Error Type String>
    {
      failures: [[
        <Failure Code Number>
        <Failure Code Message String>
        <Failure Code Details Object>
      ]]
    }
  ]
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!!args.id && !isHash(args.id)) {
          return cbk([400, 'ExpectedStandardHexPaymentHashId']);
        }

        if (!args.lnd || !args.lnd.router || !args.lnd.router.sendToRoute) {
          return cbk([400, 'ExpectedLndForToPayViaSpecifiedRoutes']);
        }

        if (!isArray(args.routes) || !args.routes.length) {
          return cbk([400, 'ExpectedArrayOfRoutesToPayViaRoutes']);
        }

        if (!!args.routes.find(n => n.hops.find(hop => !hop.public_key))) {
          return cbk([400, 'ExpectedPublicKeyInPayViaRouteHops']);
        }

        if (!!args.routes.find(n => n.hops.length > maxHopsCount)) {
          return cbk([400, 'ExpectedRouteWithFewerThanMaxHops']);
        }

        return cbk();
      },

      // Pay via routes
      payViaRoutes: ['validate', ({}, cbk) => {
        const result = {failures: []};

        const sub = subscribeToPayViaRoutes({
          id: args.id,
          lnd: args.lnd,
          messages: args.messages,
          pathfinding_timeout: args.pathfinding_timeout,
          routes: args.routes,
        });

        sub.on('success', success => result.success = success);

        sub.on('end', () => {
          if (!result.failures.length && !result.success) {
            return cbk([503, 'FailedToReceiveDiscreteFailureOrSuccess']);
          }

          if (!!result.success) {
            return cbk(null, {
              failures: result.failures,
              fee: result.success.fee,
              fee_mtokens: result.success.fee_mtokens,
              hops: result.success.hops.map(hop => ({
                channel: hop.channel,
                channel_capacity: hop.channel_capacity,
                fee: hop.fee,
                fee_mtokens: hop.fee_mtokens,
                forward: hop.forward,
                forward_mtokens: hop.forward_mtokens,
                timeout: hop.timeout,
              })),
              id: result.success.id,
              is_confirmed: true,
              is_outgoing: true,
              mtokens: result.success.mtokens,
              safe_fee: result.success.safe_fee,
              safe_tokens: result.success.safe_tokens,
              secret: result.success.secret,
              tokens: result.success.tokens,
            });
          }

          const {failures} = result;

          const [[lastFailCode, lastFailMessage]] = failures.slice().reverse();

          return cbk([lastFailCode, lastFailMessage, {failures}]);
        });

        sub.on('error', err => result.failures.push(err));
        sub.on('failure', ({failure}) => result.failures.push(failure));

        return;
      }],
    },
    returnResult({reject, resolve, of: 'payViaRoutes'}, cbk));
  });
};
