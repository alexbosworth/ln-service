const {createHash} = require('crypto');

const {broadcastResponse} = require('./../async-util');
const payPaymentRequest = require('./pay_payment_request');
const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Make a payment.

  Either a payment path or a BOLT 11 payment request is required

  {
    [fee]: <Maximum Additional Fee Tokens To Pay Number>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [path]: {
      id: <Payment Hash Hex String>
      routes: [{
        fee: <Total Fee Tokens To Pay Number>
        fee_mtokens: <Total Fee Millitokens To Pay String>
        hops: [{
          channel_capacity: <Channel Capacity Tokens Number>
          channel_id: <Unique Channel Id String>
          fee: <Fee Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          timeout: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens To Pay String>
        timeout: <Expiration Block Height Number>
        tokens: <Total Tokens To Pay Number>
      }]
    }
    [request]: <BOLT 11 Payment Request String>
    [tokens]: <Total Tokens To Pay to Payment Request Number>
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
    mtokens: <Total Millitokens Sent String>
    secret: <Payment Secret Preimage Hex String>
    tokens: <Total Tokens Sent Number>
    type: <Type String>
  }
*/
module.exports = ({fee, lnd, log, path, request, tokens, wss}, cbk) => {
  if (!path && !request) {
    return cbk([400, 'ExpectedPathOrRequestToPay']);
  }

  if (!lnd || !lnd.sendPaymentSync || !lnd.sendToRouteSync) {
    return cbk([400, 'ExpectedLndForPaymentExecution']);
  }

  if (!!path && !path.id) {
    return cbk([400, 'ExpectedPaymentHashStringToExecutePayment']);
  }

  if (!!path && (!Array.isArray(path.routes) || !path.routes.length)) {
    return cbk([400, 'ExpectedRoutesToExecutePaymentOver']);
  }

  // Exit early when the invoice is defined
  if (!path) {
    return payPaymentRequest({fee, lnd, log, request, tokens, wss}, cbk);
  }

  lnd.sendToRouteSync({
    payment_hash_string: path.id,
    routes: path.routes
      .filter(route => fee === undefined || route.fee <= fee)
      .map(route => {
        return {
          hops: route.hops.map(hop => {
            return {
              amt_to_forward: hop.forward.toString(),
              amt_to_forward_msat: hop.forward_mtokens,
              chan_id: hop.channel_id,
              chan_capacity: hop.channel_capacity.toString(),
              expiry: hop.timeout,
              fee: hop.fee.toString(),
              fee_msat: hop.fee_mtokens,
            };
          }),
          total_amt: route.tokens.toString(),
          total_amt_msat: route.mtokens,
          total_fees: route.fee.toString(),
          total_fees_msat: route.fee_mtokens,
          total_time_lock: route.timeout,
        };
      }),
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'PaymentError', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResponseWhenSendingPayment']);
    }

    if (!!res && !!res.payment_error) {
      return cbk([503, 'UnableToCompletePayment', res.payment_error]);
    }

    if (!res.payment_route) {
      return cbk([503, 'ExpectedPaymentRouteInformation', res]);
    }

    if (!Array.isArray(res.payment_route.hops)) {
      return cbk([503, 'ExpectedPaymentRouteHops']);
    }

    if (!Buffer.isBuffer(res.payment_preimage)) {
      return cbk([503, 'ExpectedPaymentPreimageBuffer']);
    }

    if (res.payment_route.total_amt === undefined) {
      return cbk([503, 'ExpectedPaymentTotalSentAmount']);
    }

    if (res.payment_route.total_amt_msat === undefined) {
      return cbk([503, 'ExpectedPaymentTotalMillitokensSentAmount']);
    }

    if (res.payment_route.total_fees === undefined) {
      return cbk([503, 'ExpectedRouteFeesPaidValue']);
    }

    if (res.payment_route.total_fees_msat === undefined) {
      return cbk([503, 'ExpectedRouteFeesMillitokensPaidValue']);
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

