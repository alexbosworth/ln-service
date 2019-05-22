const {createHash} = require('crypto');

const {chanFormat} = require('bolt07');

const {broadcastResponse} = require('./../async-util');
const rowTypes = require('./conf/row_types');

const decBase = 10;
const {isArray} = Array;

/** Send a channel payment.

  {
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [max_fee]: <Maximum Additional Fee Tokens To Pay Number>
    [outgoing_channel]: <Pay Through Outbound Standard Channel Id String>
    request: <BOLT 11 Payment Request String>
    timeout: <Max CLTV Timeout Number>
    [tokens]: <Total Tokens To Pay to Request Number>
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
    mtokens: <Millitokens Paid String>
    secret: <Payment Preimage Hex String>
    tokens: <Paid Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.default || !args.lnd.default.sendPaymentSync) {
    return cbk([400, 'ExpectedLndForPayingPaymentRequest']);
  }

  if (!args.request) {
    return cbk([400, 'ExpectedPaymentRequestToPay']);
  }

  if (!!args.wss && !isArray(args.wss)) {
    return cbk([400, 'ExpectedWebSocketServerArrayForPaymentNotification']);
  }

  if (!!args.wss && !args.log) {
    return cbk([400, 'ExpectedLogFunctionForPaymentNotificationStatus']);
  }

  const params = {payment_request: args.request};

  if (!!args.max_fee) {
    params.fee_limit = {fixed: args.max_fee};
  }

  if (!!args.outgoing_channel) {
    try {
      const channel = args.outgoing_channel;

      params.outgoing_chan_id = chanFormat({channel}).number;
    } catch (err) {
      return cbk([400, 'UnexpectedFormatForOutgoingChannelId', {err}]);
    }
  }

  if (!!args.timeout) {
    params.cltv_limit = args.timeout;
  }

  if (!!args.tokens) {
    params.amt = args.tokens.toString();
  }

  return args.lnd.default.sendPaymentSync(params, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedSendPaymentError', {err}]);
    }

    if (!!res && /UnknownPaymentHash/.test(res.payment_error)) {
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

    if (!Array.isArray(res.payment_route.hops)) {
      return cbk([503, 'ExpectedPaymentRouteHops']);
    }

    if (!res.payment_route.total_fees) {
      return cbk([503, 'ExpectedPaymentFeesPaid']);
    }

    if (!res.payment_route.total_fees_msat) {
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
      id: createHash('sha256').update(res.payment_preimage).digest('hex'),
      is_confirmed: true,
      is_outgoing: true,
      mtokens: res.payment_route.total_amt_msat,
      secret: res.payment_preimage.toString('hex'),
      tokens: parseInt(res.payment_route.total_amt, decBase),
      type: rowTypes.channel_transaction,
    };

    if (!!args.wss) {
      broadcastResponse({row, log: args.log, wss: args.wss});
    }

    return cbk(null, row);
  });
};
