const {createHash} = require('crypto');

const {broadcastResponse} = require('./../async-util');
const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Send a channel payment.

  {
    [fee]: <Maximum Additional Fee Tokens To Pay Number>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required if wss is set
    request: <BOLT 11 Payment Request String>
    [tokens]: <Total Tokens To Pay to Request Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid Millitokens String>
    hops: [{
      channel_capacity: <Hop Channel Capacity Tokens Number>
      channel_id: <Hop Channel Id String>
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
module.exports = ({fee, lnd, log, request, tokens, wss}, cbk) => {
  if (!lnd || !lnd.sendPaymentSync) {
    return cbk([400, 'ExpectedLndForPayingPaymentRequest']);
  }

  if (!request) {
    return cbk([400, 'ExpectedPaymentRequestToPay']);
  }

  if (!!wss && !Array.isArray(wss)) {
    return cbk([400, 'ExpectedWebSocketServerArrayForPaymentNotification']);
  }

  if (!!wss && !log) {
    return cbk([400, 'ExpectedLogFunctionForPaymentNotificationStatus']);
  }

  const params = {payment_request: request};

  if (!!fee) {
    params.fee_limit = {fixed: fee};
  }

  if (!!tokens) {
    params.amt = tokens.toString();
  }

  return lnd.sendPaymentSync(params, (err, res) => {
    if (!!err) {
      return cbk([503, 'SendPaymentErr', err, res]);
    }

    if (!!res && !!res.payment_error) {
      return cbk([503, 'SendPaymentFail', res.payment_error]);
    }

    if (!res.payment_preimage) {
      return cbk([503, 'ExpectedPaymentPreimage']);
    }

    if (!res.payment_route) {
      return cbk([503, 'ExpectedPaymentRoute']);
    }

    if (!res.payment_route.total_fees) {
      return cbk([503, 'ExpectedPaymentFeesPaid']);
    }

    if (!res.payment_route.total_fees_msat) {
      return cbk([503, 'ExpectedPaymentFeesPaidInMillitokens']);
    }

    const row = {
      fee: parseInt(res.payment_route.total_fees, decBase),
      fee_mtokens: res.payment_route.total_fees_msat,
      hops: res.payment_route.hops.map(hop => {
        return {
          channel_capacity: parseInt(hop.chan_capacity, decBase),
          channel_id: hop.chan_id,
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

    if (!!wss) {
      broadcastResponse({log, row, wss});
    }

    return cbk(null, row);
  });
};

