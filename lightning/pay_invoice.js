const {createHash} = require('crypto');

const {broadcastResponse} = require('./../async-util');

const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Send a channel payment.

  {
    [fee]: <Maximum Additional Fee Tokens To Pay Number>
    invoice: <Bolt 11 Invoice String>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required if wss is set
    [wss]: [<Web Socket Server Object>]
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
module.exports = ({fee, invoice, lnd, log, wss}, cbk) => {
  if (!invoice) {
    return cbk([400, 'ExpectedInvoice']);
  }

  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!!wss && !Array.isArray(wss)) {
    return cbk([500, 'ExpectedWebSocketServerArray']);
  }

  if (!!wss && !log) {
    return cbk([500, 'ExpectedLogFunction']);
  }

  const params = {payment_request: invoice};

  if (!!fee) {
    params.fee_limit = {fixed: fee};
  }

  return lnd.sendPaymentSync(params, (err, res) => {
    if (!!err) {
      return cbk([503, 'SendPaymentErr', err, res]);
    }

    if (!!res && !!res.payment_error) {
      return cbk([503, 'SendPaymentFail', res.payment_error]);
    }

    const row = {
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
    };

    if (!!wss) {
      broadcastResponse({log, row, wss});
    }

    return cbk(null, row);
  });
};

