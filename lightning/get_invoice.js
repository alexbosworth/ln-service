const asyncAuto = require('async/auto');
const {chanFormat} = require('bolt07');
const {featureFlagDetails} = require('bolt09');
const {htlcAsPayment} = require('lightning/lnd_responses');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const dateFrom = epoch => new Date(1e3 * epoch).toISOString();
const decBase = 10;
const isHash = n => /^[0-9A-F]{64}$/i.test(n);
const {keys} = Object;
const msPerSec = 1e3;
const mtokensPerToken = BigInt('1000');

/** Lookup a channel invoice.

  The received value and the invoiced value may differ as invoices may be
  over-paid.

  Requires `invoices:read` permission

  {
    id: <Payment Hash Id Hex String>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    chain_address: <Fallback Chain Address String>
    [confirmed_at]: <Settled at ISO 8601 Date String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    [description_hash]: <Description Hash Hex String>
    expires_at: <ISO 8601 Date String>
    features: [{
      bit: <BOLT 09 Feature Bit Number>
      is_known: <Feature is Known Bool>
      is_required: <Feature Support is Required To Pay Bool>
      type: <Feature Type String>
    }]
    id: <Payment Hash Hex String>
    [is_canceled]: <Invoice is Canceled Bool>
    is_confirmed: <Invoice is Confirmed Bool>
    [is_held]: <HTLC is Held Bool>
    is_private: <Invoice is Private Bool>
    [is_push]: <Invoice is Push Payment Bool>
    mtokens: <Millitokens String>
    payments: [{
      [confirmed_at]: <Payment Settled At ISO 8601 Date String>
      created_at: <Payment Held Since ISO 860 Date String>
      created_height: <Payment Held Since Block Height Number>
      in_channel: <Incoming Payment Through Channel Id String>
      is_canceled: <Payment is Canceled Bool>
      is_confirmed: <Payment is Confirmed Bool>
      is_held: <Payment is Held Bool>
      messages: [{
        type: <Message Type Number String>
        value: <Raw Value Hex String>
      }]
      mtokens: <Incoming Payment Millitokens String>
      [pending_index]: <Pending Payment Channel HTLC Index Number>
      tokens: <Payment Tokens Number>
    }]
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    [request]: <Bolt 11 Invoice String>
    secret: <Secret Preimage Hex String>
    tokens: <Tokens Number>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isHash(id)) {
          return cbk([400, 'ExpectedIdToGetInvoiceDetails']);
        }

        if (!isLnd({lnd, method: 'lookupInvoice', type: 'default'})) {
          return cbk([400, 'ExpectedLndToGetInvoiceDetails']);
        }

        return cbk();
      },

      // Get the invoice
      getInvoice: ['validate', ({}, cbk) => {
        return lnd.default.lookupInvoice({
          r_hash: Buffer.from(id, 'hex'),
        },
        (err, response) => {
          if (!!err) {
            return cbk([503, 'UnexpectedLookupInvoiceErr', {err}]);
          }

          if (!response) {
            return cbk([503, 'ExpectedResponseWhenLookingUpInvoice']);
          }

          try {
            response.htlcs.forEach(htlc => htlcAsPayment(htlc));
          } catch (err) {
            return cbk([503, 'UnexpectedErrorWithInvoiceHtlc', {err}]);
          }

          if (response.memo === undefined) {
            return cbk([503, 'ExpectedMemoInLookupInvoiceResponse']);
          }

          if (!response.is_keysend && !response.payment_request) {
            return cbk([503, 'ExpectedPaymentRequestForInvoice']);
          }

          if (!Buffer.isBuffer(response.r_preimage)) {
            return cbk([503, 'ExpectedPreimageInLookupInvoiceResponse']);
          }

          if (response.settled !== false && response.settled !== true) {
            return cbk([503, 'ExpectedSettledStateInLookupInvoiceResponse']);
          }

          const createdAtEpochTime = parseInt(response.creation_date, decBase);
          const descHash = response.description_hash;
          const expiresInMs = parseInt(response.expiry, decBase) * msPerSec;
          const settleDate = response.settle_date;

          const createdAtMs = createdAtEpochTime * msPerSec;

          const mtok = (BigInt(response.value) * mtokensPerToken).toString();

          return cbk(null, {
            id,
            chain_address: response.fallback_addr || undefined,
            cltv_delta: parseInt(response.cltv_expiry, decBase),
            confirmed_at: !response.settled ? undefined : dateFrom(settleDate),
            created_at: new Date(createdAtMs).toISOString(),
            description: response.memo,
            description_hash: !descHash.length ? undefined : descHash,
            expires_at: new Date(createdAtMs + expiresInMs).toISOString(),
            features: keys(response.features).map(bit => ({
              bit: Number(bit),
              is_known: response.features[bit].is_known,
              is_required: response.features[bit].is_required,
              type: featureFlagDetails({bit}).type,
            })),
            is_canceled: response.state === 'CANCELED' || undefined,
            is_confirmed: response.settled,
            is_held: response.state === 'ACCEPTED' || undefined,
            is_private: response.private,
            is_push: response.is_keysend || undefined,
            mtokens: response.value_msat === '0' ? mtok : response.value_msat,
            payments: response.htlcs.map(htlcAsPayment),
            received: parseInt(response.amt_paid_sat, decBase),
            received_mtokens: response.amt_paid_msat,
            request: response.payment_request || undefined,
            secret: response.r_preimage.toString('hex'),
            tokens: !response.value ? null : parseInt(response.value, decBase),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getInvoice'}, cbk));
  });
};
