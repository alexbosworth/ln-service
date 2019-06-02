const {randomBytes} = require('crypto');

const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {chanNumber} = require('bolt07');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');
const {getChannel} = require('./../lightning');
const paymentFailure = require('./payment_failure');
const rowTypes = require('./../lightning/conf/row_types');
const rpcRouteFromRoute = require('./rpc_route_from_route');
const subscribeToPayViaRoutes = require('./subscribe_to_pay_via_routes');

const {isArray} = Array;
const {now} = Date;
const payHashLength = Buffer.alloc(32).length;

/** Make a payment via a specified route

  If no id is specified, a random id will be used

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
      mtokens: <Total Millitokens To Pay String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens To Pay Number>
    }
  }

  @returns via cbk
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
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Number>
    type: <Type String>
  }

  @returns error via cbk
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
  if (!!args.id && !isHex(args.id)) {
    return cbk([400, 'ExpectedStandardHexPaymentHashId']);
  }

  if (!args.lnd || !args.lnd.router || !args.lnd.router.sendToRoute) {
    return cbk([400, 'ExpectedAuthenticatedLndForToPayViaSpecifiedRoutes']);
  }

  if (!isArray(args.routes) || !args.routes.length) {
    return cbk([400, 'ExpectedArrayOfRoutesToPayViaRoutes']);
  }

  if (!!args.routes.find(n => n.hops.find(hop => !hop.public_key))) {
    return cbk([400, 'ExpectedPublicKeyInPayViaRouteHops']);
  }

  const result = {failures: []};

  const sub = subscribeToPayViaRoutes({
    id: args.id,
    lnd: args.lnd,
    pathfinding_timeout: args.pathfinding_timeout,
    routes: args.routes,
  });

  sub.on('success', success => result.success = success);

  sub.on('end', () => {
    if (!result.success && !result.failures.length) {
      return cbk([500, 'FailedToReceiveFailureOrSuccessForPaymentViaRoute']);
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
        secret: result.success.secret,
        tokens: result.success.tokens,
        type: 'channel_transaction',
      });
    }

    const {failures} = result;

    const [[lastFailureCode, lastFailureMessage]] = failures.slice().reverse();

    return cbk([lastFailureCode, lastFailureMessage, {failures}]);
  });

  sub.on('error', err => result.failures.push(err));
  sub.on('failure', ({failure}) => result.failures.push(failure));

  return;
};
