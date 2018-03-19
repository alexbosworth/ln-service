const {isFinite} = require('lodash');

const rowTypes = require('./conf/row_types');

const intBase = 10;
const msPerSec = 1e3;

/** Get decoded invoice

  {
    invoice: <Serialized BOLT 11 Invoice String>
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    chain_address: <Fallback Chain Address String>
    description: <Payment Description String>
    destination_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    tokens: <Requested Tokens Number>
    type: <Type String>
  }
*/
module.exports = ({invoice, lnd}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!invoice) {
    return cbk([400, 'ExpectedInvoice']);
  }

  return lnd.decodePayReq({pay_req: invoice}, (err, res) => {
    if (!!err) {
      return cbk([503, 'DecodePayReqErr', err]);
    }

    if (!res.destination) {
      return cbk([503, 'ExpectedDestination', res]);
    }

    if (!res.payment_hash) {
      return cbk([503, 'ExpectedPaymentHash', res]);
    }

    if (!isFinite(parseInt(res.num_satoshis, intBase))) {
      return cbk([503, 'ExpectedNumSatoshis', res]);
    }

    const createdAt = parseInt(res.timestamp, intBase) * msPerSec;
    const expiresInMs = parseInt(res.expiry, intBase) * msPerSec;

    const expiryDateMs = createdAt + expiresInMs;

    return cbk(null, {
      chain_address: res.fallback_addr || null,
      created_at: new Date(createdAt).toISOString(),
      description: res.description,
      description_hash: res.description_hash,
      destination: res.destination,
      expires_at: !res.expiry ? null : new Date(expiryDateMs).toISOString(),
      id: res.payment_hash,
      tokens: parseInt(res.num_satoshis, intBase),
      type: rowTypes.invoice,
    });
  });
};

