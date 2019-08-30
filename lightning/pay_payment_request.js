const {createHash} = require('crypto');

const asyncAuto = require('async/auto');
const {chanFormat} = require('bolt07');
const {chanNumber} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');

const decBase = 10;
const {isArray} = Array;
const sha256 = preimage => createHash('sha256').update(preimage).digest('hex');

/** Send a channel payment.

  {
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [max_fee]: <Maximum Additional Fee Tokens To Pay Number>
    [max_timeout_height]: <Max CLTV Timeout Number>
    [outgoing_channel]: <Pay Through Outbound Standard Channel Id String>
    request: <BOLT 11 Payment Request String>
    [tokens]: <Total Tokens To Pay to Request Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk or Promise
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
    mtokens: <Millitokens Paid String>
    secret: <Payment Preimage Hex String>
    tokens: <Paid Tokens Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default) {
          return cbk([400, 'ExpectedLndForPayingPaymentRequest']);
        }

        if (!!args.outgoing_channel) {
          try {
            chanNumber({channel}).number;
          } catch (err) {
            return cbk([400, 'UnexpectedFormatForOutgoingChannelId', {err}]);
          }
        }

        if (!args.request) {
          return cbk([400, 'ExpectedPaymentRequestToPay']);
        }

        if (!!args.wss && !isArray(args.wss)) {
          return cbk([400, 'ExpectedWebSocketServerArrForPaymentPushes']);
        }

        if (!!args.wss && !args.log) {
          return cbk([400, 'ExpectedLogFunctionForPaymentNotificationStatus']);
        }

        return cbk();
      },

      // Attempt payment
      pay: ['validate', ({}, cbk) => {
        const params = {
          amt: !args.tokens ? undefined : args.tokens.toString(),
          cltv_limit: args.max_timeout_height || undefined,
          fee_limit: !args.max_fee ? undefined : {fixed: args.max_fee},
          payment_request: args.request,
        };

        if (!!args.outgoing_channel) {
          params.outgoing_chan_id = chanNumber({channel}).number;
        }

        return args.lnd.default.sendPaymentSync(params, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedSendPaymentError', {err}]);
          }

          if (!!res && /UnknownPaymentHash/.test(res.payment_error)) {
            return cbk([404, 'UnknownPaymentHash']);
          }

          if (!!res && /UnknownPaymentDetails/.test(res.payment_error)) {
            return cbk([404, 'UnknownPaymentHash']);
          }

          if (!!res && !!res.payment_error) {
            return cbk([503, 'SendPaymentFail', {message: res.payment_error}]);
          }

          if (!res.payment_preimage) {
            return cbk([503, 'ExpectedPaymentPreimage']);
          }

          if (!res.payment_route) {
            return cbk([503, 'ExpectedPaymentRoute']);
          }

          if (!isArray(res.payment_route.hops)) {
            return cbk([503, 'ExpectedPaymentRouteHops']);
          }

          if (res.payment_route.total_fees === undefined) {
            return cbk([503, 'ExpectedPaymentFeesPaid']);
          }

          if (res.payment_route.total_fees_msat === undefined) {
            return cbk([503, 'ExpectedPaymentFeesPaidInMillitokens']);
          }

          const {hops} = res.payment_route;

          try {
            const _ = hops.map(n => chanFormat({number: n.chan_id}));
          } catch (err) {
            return cbk([503, 'ExpectedValidChannelIdsInHopsForRoute', {err}]);
          }

          const row = {
            fee: parseInt(res.payment_route.total_fees, decBase),
            fee_mtokens: res.payment_route.total_fees_msat,
            hops: hops.map(hop => {
              return {
                channel_capacity: parseInt(hop.chan_capacity, decBase),
                channel: chanFormat({number: hop.chan_id}).channel,
                fee_mtokens: hop.fee_msat,
                forward_mtokens: hop.amt_to_forward_msat,
                timeout: hop.expiry,
              };
            }),
            id: sha256(res.payment_preimage),
            is_confirmed: true,
            is_outgoing: true,
            mtokens: res.payment_route.total_amt_msat,
            secret: res.payment_preimage.toString('hex'),
            tokens: parseInt(res.payment_route.total_amt, decBase),
          };

          if (!!args.wss) {
            broadcastResponse({row, log: args.log, wss: args.wss});
          }

          return cbk(null, row);
        });
      }],
    },
    returnResult({reject, resolve, of: 'pay'}, cbk));
  });
};
