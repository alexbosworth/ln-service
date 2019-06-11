const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const decBase = 10;
const msPerSec = 1e3;
const mtokensPerToken = 1000n;

/** Lookup a channel invoice.

  The received value and the invoiced value may differ as invoices may be
  over-paid.

  {
    id: <Payment Hash Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    chain_address: <Fallback Chain Address String>
    [confirmed_at]: <Settled at ISO 8601 Date String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    description_hash: <Description Hash Hex String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Hash String>
    [is_canceled]: <Invoice is Canceled Bool>
    is_confirmed: <Invoice is Confirmed Bool>
    [is_held]: <HTLC is Held Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    is_private: <Invoice is Private Bool>
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <Bolt 11 Invoice String>
    secret: <Secret Preimage Hex String>
    tokens: <Tokens Number>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!id || !isHex(id)) {
          return cbk([400, 'ExpectedIdToGetInvoiceDetails']);
        }

        if (!lnd || !lnd.default || !lnd.default.lookupInvoice) {
          return cbk([400, 'ExpectedLndToGetInvoiceDetails']);
        }

        return cbk();
      },

      // Get the invoice
      getInvoice: ['validate', ({}, cbk) => {
        return lnd.default.lookupInvoice({r_hash_str: id}, (err, response) => {
          if (!!err) {
            return cbk([503, 'UnexpectedLookupInvoiceErr', {err}]);
          }

          if (!response) {
            return cbk([503, 'ExpectedResponseWhenLookingUpInvoice']);
          }

          if (response.memo === undefined) {
            return cbk([503, 'ExpectedMemoInLookupInvoiceResponse']);
          }

          if (!response.payment_request) {
            return cbk([503, 'ExpectedPaymentRequestForInvoice']);
          }

          if (response.settled !== false && response.settled !== true) {
            return cbk([503, 'ExpectedSettledStateInLookupInvoiceResponse']);
          }

          if (!Buffer.isBuffer(response.r_preimage)) {
            return cbk([503, 'ExpectedPreimageInLookupInvoiceResponse']);
          }

          const createdAtEpochTime = parseInt(response.creation_date, decBase);
          const expiresInMs = parseInt(response.expiry, decBase) * msPerSec;

          const createdAtMs = createdAtEpochTime * msPerSec;

          return cbk(null, {
            id,
            chain_address: response.fallback_addr || undefined,
            cltv_delta: parseInt(response.cltv_expiry, decBase),
            created_at: new Date(createdAtMs).toISOString(),
            description: response.memo,
            expires_at: new Date(createdAtMs + expiresInMs).toISOString(),
            is_canceled: response.state === 'CANCELED' || undefined,
            is_confirmed: response.settled,
            is_held: response.state === 'ACCEPTED' || undefined,
            is_private: response.private,
            mtokens: (BigInt(response.value) * mtokensPerToken).toString(),
            received: parseInt(response.amt_paid_sat, decBase),
            received_mtokens: response.amt_paid_msat,
            request: response.payment_request,
            secret: response.r_preimage.toString('hex'),
            tokens: !response.value ? null : parseInt(response.value, decBase),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getInvoice'}, cbk));
  });
};
