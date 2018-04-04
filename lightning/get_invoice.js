const rowTypes = require('./conf/row_types');

const intBase = 10;
const msPerSec = 1e3;

/** Lookup a channel invoice.

  {
    lnd: <LND GRPC API Object>
    id: <Payment Hash Id Hex String>
  }

  @returns via cbk
  {
    description: <Description String>
    expires_at: <ISO 8601 Date String>
    id: <Invoice Id String>
    invoice: <Bolt 11 Invoice String>
    is_confirmed: <Is Finalized Bool>
    is_outgoing: <Is Outgoing Bool>
    payment_secret: <Hex Encoded Payment Secret Preimage String>
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
      return cbk([500, 'LookupInvoiceErr', err]);
    }

    if (response.memo === undefined) {
      return cbk([500, 'ExpectedMemo', response]);
    }

    if (response.settled !== false && response.settled !== true) {
      return cbk([500, 'MissingSettled', response]);
    }

    if (!Buffer.isBuffer(response.r_preimage)) {
      return cbk([500, 'ExpectedInvoicePreimage']);
    }

    const createdAt = parseInt(response.creation_date, intBase) * msPerSec;
    const expiresInMs = parseInt(response.expiry, intBase) * msPerSec;

    const expiryDateMs = createdAt + expiresInMs;

    return cbk(null, {
      id,
      description: response.memo,
      expires_at: new Date(expiryDateMs).toISOString(),
      invoice: response.payment_request,
      is_confirmed: response.settled,
      is_outgoing: false,
      payment_secret: response.r_preimage.toString('hex'),
      type: rowTypes.channel_transaction,
    });
  });
};

