const {createHash} = require('crypto');

const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {chanNumber} = require('bolt07');
const {encodeChanId} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');
const payPaymentRequest = require('./pay_payment_request');
const rowTypes = require('./conf/row_types');

const chanIdMatch = /(\d+[x\:]\d+[\:x]\d+)/gim;
const chanSplit = /[\:x\,]/;
const decBase = 10;
const defaultMaxFee = Number.MAX_SAFE_INTEGER;
const flatten = arr => [].concat(...arr);
const isArray = Array;
const noRoutesProvidedError = 'unable to send, no routes provided';
const {now} = Date;
const preimageLength = 32;
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');

/** Make a payment.

  Either a payment path or a BOLT 11 payment request is required

  For paying to private destinations along set paths, a public key in the route
  hops is required to form the route.

  {
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [max_fee]: <Maximum Additional Fee Tokens To Pay Number>
    [outgoing_channel]: <Pay Through Outbound Standard Channel Id String>
    [path]: {
      id: <Payment Hash Hex String>
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
      }]
    }
    [pathfinding_timeout]: <Time to Spend Finding a Route Milliseconds Number>
    [request]: <BOLT 11 Payment Request String>
    [timeout_height]: <Max CLTV Timeout Number>
    [tokens]: <Total Tokens To Pay to Payment Request Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk
  {
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
*/
module.exports = (args, cbk) => {
  if (!args.path && !args.request) {
    return cbk([400, 'ExpectedPathOrRequestToPay']);
  }

  if (!args.lnd || !args.lnd.default || !args.lnd.default.sendPaymentSync) {
    return cbk([400, 'ExpectedLndForPaymentExecution']);
  }

  if (!!args.path && !args.path.id) {
    return cbk([400, 'ExpectedPaymentHashStringToExecutePayment']);
  }

  if (!args.path && !!args.pathfinding_timeout) {
    return cbk([400, 'PathfindingTimeoutNotSupportedWithRequestPay']);
  }

  // Exit early when the invoice is defined
  if (!args.path) {
    return payPaymentRequest({
      lnd: args.lnd,
      log: args.log,
      max_fee: args.max_fee || defaultMaxFee,
      outgoing_channel: args.outgoing_channel,
      request: args.request,
      timeout_height: args.timeout_height,
      tokens: args.tokens,
      wss: args.wss,
    },
    cbk);
  }

  if (!!args.outgoing_channel) {
    return cbk([400, 'OutgoingChannelRestrictionNotSupportedWithPathPay']);
  }

  if (!isArray(args.path.routes) || !args.path.routes.length) {
    return cbk([400, 'ExpectedRoutesToExecutePaymentOver']);
  }

  try {
    args.path.routes.forEach(({hops}) => {
      return hops.forEach(({channel}) => chanNumber({channel}));
    });
  } catch (err) {
    return cbk([400, 'ExpectedValidRouteChannelIds', {err}]);
  }

  let isPayDone = false;
  const maxFee = args.max_fee || defaultMaxFee;
  const pathfindingTimeout = args.pathfinding_timeout;
  let payFailed = null;
  let payResult = null;
  const start = now();
  const timeout = args.timeout_height;

  const routes = args.path.routes
    .filter(route => maxFee === undefined || route.fee <= maxFee)
    .filter(route => timeout === undefined || route.timeout <= timeout)
    .map(route => {
      return {
        hops: route.hops.map(hop => {
          return {
            amt_to_forward: hop.forward.toString(),
            amt_to_forward_msat: hop.forward_mtokens,
            chan_id: chanNumber({channel: hop.channel}).number,
            chan_capacity: hop.channel_capacity.toString(),
            expiry: hop.timeout,
            fee: hop.fee.toString(),
            fee_msat: hop.fee_mtokens,
            pub_key: hop.public_key || undefined,
          };
        }),
        total_amt: route.tokens.toString(),
        total_amt_msat: route.mtokens,
        total_fees: route.fee.toString(),
        total_fees_msat: route.fee_mtokens,
        total_time_lock: route.timeout,
      };
    });

  return asyncMapSeries(routes, (route, cbk) => {
    // Exit early without trying a payment when there is a definitive result
    if (!!isPayDone) {
      return cbk();
    }

    if (!!pathfindingTimeout && now() - start > pathfindingTimeout) {
      return cbk([503, 'PathfindingTimeoutExceeded']);
    }

    return asyncAuto({
      // Try paying using single route arg
      routeAttempt: cbk => {
        return args.lnd.default.sendToRouteSync({
          route,
          payment_hash: Buffer.from(args.path.id, 'hex'),
          payment_hash_string: args.path.id,
        },
        (err, res) => {
          // Exit early when this result is garbage due to arg failure
          if (!!err && err.details === noRoutesProvidedError) {
            return cbk();
          }

          if (!!err || !res) {
            return cbk([503, 'UnexpectedPaymentErrorSendingToRoute', {err}]);
          }

          return cbk(null, res);
        });
      },

      // Try paying using multiple routes arg (from breaking lnd change)
      routesAttempt: ['routeAttempt', ({routeAttempt}, cbk) => {
        // Exit early when single route arg worked out
        if (!!routeAttempt) {
          return cbk();
        }

        return args.lnd.default.sendToRouteSync({
          payment_hash: Buffer.from(args.path.id, 'hex'),
          payment_hash_string: args.path.id,
          routes: [route],
        },
        (err, res) => {
          if (!!err || !res) {
            return cbk([503, 'UnexpectedPaymentErrorSendingToRoutes', {err}]);
          }

          return cbk(null, res);
        });
      }],

      // Attempt result
      result: [
        'routeAttempt',
        'routesAttempt',
        ({routeAttempt, routesAttempt}, cbk) =>
      {
        const attempt = routeAttempt || routesAttempt;
        let channel;

        const paymentError = attempt.payment_error || '';

        const [chanFailure] = paymentError.match(chanIdMatch) || [];

        if (paymentError === 'payment is in transition') {
          return cbk(null, {failed: [409, 'PaymentIsPendingResolution']});
        }

        if (paymentError === 'unable to find a path to destination') {
          return cbk(null, {failure: [503, 'UnknownPathToDestination']});
        }

        if (!!chanFailure) {
          const chanId = chanFailure.split(chanSplit);

          try {
            const [blockHeight, blockIndex, outputIndex] = chanId;

            const encodedFailChanId = encodeChanId({
              block_height: parseInt(blockHeight, decBase),
              block_index: parseInt(blockIndex, decBase),
              output_index: parseInt(outputIndex, decBase),
            });

            channel = encodedFailChanId.channel;
          } catch (err) {
            // Ignore errors when parsing of unstructured error message fails.
          }
        }

        if (/ChannelDisabled/.test(paymentError)) {
          return cbk(null, {
            failure: [503, 'NextHopChannelDisabled', {channel}],
          });
        }

        if (/ExpiryTooFar/.test(paymentError)) {
          return cbk(null, {failure: [503, 'ExpiryTooFar', {channel}]});
        }

        // Too close to the current height for safe handling by the final node.
        if (/ExpiryTooSoon/.test(paymentError)) {
          return cbk(null, {
            failed: [503, 'RejectedTooNearTimeout', {channel}],
          });
        }

        if (/FeeInsufficient/.test(paymentError)) {
          return cbk(null, {
            failure: [503, 'RejectedUnacceptableFee', {channel}],
          });
        }

        if (/FinalIncorrectCltvExpiry/.test(paymentError)) {
          return cbk(null, {failed: [503, 'ExpiryTooFar', {channel}]});
        }

        if (/IncorrectCltvExpiry/.test(paymentError)) {
          return cbk(null, {
            failure: [503, 'RejectedUnacceptableCltv', {channel}],
          });
        }

        if (/TemporaryChannelFailure/.test(paymentError)) {
          return cbk(null, {
            failure: [503, 'TemporaryChannelFailure', {channel}],
          });
        }

        if (/TemporaryNodeFailure/.test(paymentError)) {
          return cbk(null, {
            failure: [503, 'TemporaryNodeFailure', {channel}],
          });
        }

        if (/UnknownNextPeer/.test(paymentError)) {
          return cbk(null, {
            failure: [503, 'UnknownNextHopChannel', {channel}],
          });
        }

        if (/UnknownPaymentHash/.test(paymentError)) {
          return cbk(null, {failed: [404, 'UnknownPaymentHash']});
        }

        if (!!paymentError) {
          return cbk(null, {
            failure: [503, 'UnableToCompletePayment', paymentError],
          });
        }

        if (!Buffer.isBuffer(attempt.payment_preimage)) {
          return cbk([503, 'ExpectedPaymentPreimageBuffer']);
        }

        if (attempt.payment_preimage.length !== preimageLength) {
          return cbk([503, 'UnexpectedLengthOfPreimageInPayResponse']);
        }

        if (!attempt.payment_route) {
          return cbk([503, 'ExpectedPaymentRouteInformation']);
        }

        if (!isArray(attempt.payment_route.hops)) {
          return cbk([503, 'ExpectedPaymentRouteHops']);
        }

        if (attempt.payment_route.total_amt === undefined) {
          return cbk([503, 'ExpectedPaymentTotalSentAmount']);
        }

        if (attempt.payment_route.total_amt_msat === undefined) {
          return cbk([503, 'ExpectedPaymentTotalMillitokensSentAmount']);
        }

        if (attempt.payment_route.total_fees === undefined) {
          return cbk([503, 'ExpectedRouteFeesPaidValue']);
        }

        if (attempt.payment_route.total_fees_msat === undefined) {
          return cbk([503, 'ExpectedRouteFeesMillitokensPaidValue']);
        }

        const {hops} = attempt.payment_route;

        // Check to make sure that the payment hops are valid
        try {
          hops.forEach(hop => chanFormat({number: hop.chan_id}));
        } catch (err) {
          return cbk([503, 'ExpectedNumericChanIdInPaymentResponse', {err}]);
        }

        const row = {
          fee: parseInt(attempt.payment_route.total_fees, decBase),
          fee_mtokens: attempt.payment_route.total_fees_msat,
          hops: attempt.payment_route.hops.map(hop => {
            return {
              channel_capacity: parseInt(hop.chan_capacity, decBase),
              channel: chanFormat({number: hop.chan_id}).channel,
              fee_mtokens: hop.fee_msat,
              forward_mtokens: hop.amt_to_forward_msat,
              timeout: hop.expiry,
            };
          }),
          id: sha256(attempt.payment_preimage),
          is_confirmed: true,
          is_outgoing: true,
          mtokens: attempt.payment_route.total_amt_msat,
          secret: attempt.payment_preimage.toString('hex'),
          tokens: parseInt(attempt.payment_route.total_amt, decBase),
          type: rowTypes.channel_transaction,
        };

        return cbk(null, {row});
      }],

      // Set pay result and pay error
      setResult: ['result', ({result}, cbk) => {
        // A definitive failure has been received
        if (!!result.failed) {
          isPayDone = !!result.failed;
          payFailed = result.failed;

          return cbk();
        }

        // A failure instance has been received for this route
        if (!!result.failure) {
          payFailed = result.failure;

          return cbk();
        }

        // Attempts should either result in a failure or a success
        if (!result.row) {
          return cbk([500, 'UnexpectedResultWhenPayingToRoutes']);
        }

        if (!!args.wss) {
          broadcastResponse({log: args.log, row: result.row, wss: args.wss});
        }

        isPayDone = !!result.row;
        payResult = result.row;

        return cbk();
      }],
    },
    returnResult({of: 'result'}, cbk));
  },
  err => {
    if (!!err) {
      return cbk(err);
    }

    // There should always be either a pay failed or a pay result
    if (!isArray(payFailed) && !payResult) {
      return cbk([500, 'ExpectedPayFailureWhenRoutesPaymentFinished']);
    }

    if (!!payFailed && !payResult) {
      return cbk(payFailed);
    }

    return cbk(null, payResult);
  });
};
