const {createHash} = require('crypto');

const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Make a payment using defined routes

  {
    id: <Payment Hash String>
    lnd: <LND GRPC API Object>
    routes: [{
      hops: [{
        channel_capacity: <Channel Capacity Tokens Number>
        channel_id: <Unique Channel Id String>
        fee: <Fee Number>
        fee_mtokens: <Fee MilliTokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward MilliTokens String>
        timeout: <Timeout Block Height Number>
      }]
    }]
  }

  @returns via cbk
  {
    fee: <Fee Paid Tokens Number>
    fee_mtokens: <Fee Paid MilliTokens String>
    hop_count: <Hop Count Number>
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    mtokens: <MilliTokens Paid String>
    payment_secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = ({id, lnd, routes}, cbk) => {
  if (!id) {
    return cbk([400, 'ExpectedPaymentHashStringToExecutePayment']);
  }

  if (!lnd || !lnd.sendToRouteSync) {
    return cbk([400, 'ExpectedLndForPaymentExecution']);
  }

  if (!Array.isArray(routes) || !routes.length) {
    return cbk([400, 'ExpectedRoutesToExecutePaymentOver']);
  }

  lnd.sendToRouteSync({
    payment_hash_string: id,
    routes: routes.map(route => {
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
      return cbk([503, 'ExpectedPaymentTotalMilliTokensSentAmount']);
    }

    if (res.payment_route.total_fees === undefined) {
      return cbk([503, 'ExpectedRouteFeesPaidValue']);
    }

    if (res.payment_route.total_fees_msat === undefined) {
      return cbk([503, 'ExpectedRouteFeesMilliTokensPaidValue']);
    }

    return cbk(null, {
      fee: parseInt(res.payment_route.total_fees, decBase),
      fee_mtokens: res.payment_route.total_fees_msat,
      hop_count: res.payment_route.hops.length,
      id: createHash('sha256').update(res.payment_preimage).digest('hex'),
      is_confirmed: true,
      is_outgoing: true,
      mtokens: res.payment_route.total_amt_msat,
      payment_secret: res.payment_preimage.toString('hex'),
      tokens: parseInt(res.payment_route.total_amt, decBase),
      type: rowTypes.channel_transaction,
    });
  });
};

