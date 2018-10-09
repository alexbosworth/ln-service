const rowTypes = require('./conf/row_types');

const decBase = 10;
const msPerSec = 1e3;

/** Lookup a channel invoice.

  The received value and the invoiced value may differ as invoices may be
  over-paid.

  {
    id: <Payment Hash Id Hex String>
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    description: <Description String>
    expires_at: <ISO 8601 Date String>
    id: <Invoice Id String>
    is_confirmed: <Is Finalized Bool>
    is_outgoing: <Is Outgoing Bool>
    is_private: <Is a Private Invoice Bool>
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <BOLT 11 Encoded Payment Request String>
    secret: <Hex Encoded Payment Secret Preimage String>
    [tokens]: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  if (!id) {
    return cbk([400, 'ExpectedId']);
  }

  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  return lnd.lookupInvoice({r_hash_str: id}, (err, response) => {
    if (!!err) {
      return cbk([503, 'LookupInvoiceErr', err]);
    }

    if (response.memo === undefined) {
      return cbk([503, 'ExpectedMemo', response]);
    }

    if (!response.payment_request) {
      return cbk([503, 'ExpectedPaymentRequestForInvoice']);
    }

    if (response.settled !== false && response.settled !== true) {
      return cbk([503, 'MissingSettled', response]);
    }

    if (!Buffer.isBuffer(response.r_preimage)) {
      return cbk([503, 'ExpectedInvoicePreimage']);
    }

    const createdAt = parseInt(response.creation_date, decBase) * msPerSec;
    const expiresInMs = parseInt(response.expiry, decBase) * msPerSec;

    const expiryDateMs = createdAt + expiresInMs;

    return cbk(null, {
      id,
      description: response.memo,
      expires_at: new Date(expiryDateMs).toISOString(),
      is_confirmed: response.settled,
      is_outgoing: false,
      is_private: response.private,
      received: parseInt(response.amt_paid_sat, decBase),
      received_mtokens: response.amt_paid_msat,
      request: response.payment_request,
      secret: response.r_preimage.toString('hex'),
      tokens: !response.value ? null : parseInt(response.value, decBase),
      type: rowTypes.channel_transaction,
    });
  });
};

