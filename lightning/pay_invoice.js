const {createHash} = require('crypto');

const {broadcastResponse} = require('./../async-util');

const rowTypes = require('./conf/row_types');

const intBase = 10;

/** Send a channel payment.

  {
    invoice: <Bolt 11 Invoice String>
    lnd: <LND GRPC API Object>
    wss: [<Web Socket Server Object>]
  }

  @returns via cbk
  [{
    fee: <Fee Paid Tokens Number>
    hop_count: <Hop Count Number>
    id: <Payment Hash Hex String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outoing Bool>
    payment_secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
    type: <Type String>
  }]
*/
module.exports = ({invoice, lnd, wss}, cbk) => {
  if (!invoice) {
    return cbk([400, 'ExpectedInvoice']);
  }

  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!wss) {
    return cbk([500, 'ExpectedWebSocketServer']);
  }

  return lnd.sendPaymentSync({payment_request: invoice}, (err, res) => {
    if (!!err) {
      return cbk([503, 'SendPaymentErr', err, res]);
    }

    if (!!res && !!res.payment_error) {
      return cbk([503, 'SendPaymentFail', res.payment_error]);
    }

    const row = {
      fee: parseInt(res.payment_route.total_fees, intBase),
      hop_count: res.payment_route.hops.length,
      id: createHash('sha256').update(res.payment_preimage).digest('hex'),
      is_confirmed: true,
      is_outgoing: true,
      payment_secret: res.payment_preimage.toString('hex'),
      tokens: parseInt(res.payment_route.total_amt, intBase),
      type: rowTypes.channel_transaction,
    };

    broadcastResponse({row, wss});

    return cbk(null, row);
  });
};

