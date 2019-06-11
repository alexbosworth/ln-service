const {createHash} = require('crypto');

const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {chanFormat} = require('bolt07');
const {isBoolean} = require('lodash');
const {isFinite} = require('lodash');
const {isString} = require('lodash');
const {returnResult} = require('asyncjs-util');
const {sortBy} = require('lodash');

const acceptedState = 'ACCEPTED';
const canceledState = 'CANCELED';
const decBase = 10;
const defaultLimit = 100;
const {isArray} = Array;
const lastPageFirstIndexOffset = 1;
const msPerSec = 1e3;
const mtokensPerToken = 1000n;
const {parse} = JSON;
const {stringify} = JSON;

/** Get all created invoices.

  {
    [limit]: <Page Result Limit Number>
    lnd: <Authenticated LND gRPC API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    invoices: [{
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
      routes: [[{
        base_fee_mtokens: <Base Routing Fee In Millitokens Number>
        channel: <Standard Format Channel Id String>
        cltv_delta: <CLTV Blocks Delta Number>
        fee_rate: <Fee Rate In Millitokens Per Million Number>
        public_key: <Public Key Hex String>
      }]]
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
module.exports = ({limit, lnd, token}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Validate arguments
      validate: cbk => {
        if (!!limit && !!token) {
          return cbk([400, 'UnexpectedLimitWhenPagingInvoicesWithToken']);
        }

        if (!lnd || !lnd.default || !lnd.default.listInvoices) {
          return cbk([400, 'ExpectedLndForInvoiceListing']);
        }

        return cbk();
      },

      // Get the list of invoices
      listInvoices: ['validate', ({}, cbk) => {
        let offset;
        let resultsLimit = limit || defaultLimit;

        if (!!token) {
          try {
            const pagingToken = parse(token);

            offset = pagingToken.offset;
            resultsLimit = pagingToken.limit;
          } catch (err) {
            return cbk([400, 'ExpectedValidPagingTokenForInvoicesReq', {err}]);
          }
        }

        return lnd.default.listInvoices({
          index_offset: offset || 0,
          num_max_invoices: resultsLimit,
          reversed: true,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedGetInvoicesError', {err}]);
          }

          if (!res || !isArray(res.invoices)) {
            return cbk([503, 'ExpectedInvoicesListInResponseToInvoicesQuery']);
          }

          if (typeof res.last_index_offset !== 'string') {
            return cbk([503, 'ExpectedLastIndexOffsetWhenRequestingInvoices']);
          }

          const offset = parseInt(res.first_index_offset, decBase);

          const token = stringify({offset, limit: resultsLimit});

          return cbk(null, {
            token: offset === lastPageFirstIndexOffset ? undefined : token,
            invoices: res.invoices,
          });
        });
      }],

      // Mapped invoices
      mappedInvoices: ['listInvoices', ({listInvoices}, cbk) => {
        return asyncMap(listInvoices.invoices, (invoice, cbk) => {
          const creationEpochDate = parseInt(invoice.creation_date, decBase);
          const descHash = invoice.description_hash;
          const expiresInMs = parseInt(invoice.expiry, decBase) * msPerSec;
          let settledDate = undefined;

          if (!invoice.amt_paid_msat) {
            return cbk([503, 'ExpectedInvoiceAmountPaidMillitokensInInvoice']);
          }

          if (!invoice.amt_paid_sat) {
            return cbk([503, 'ExpectedInvoiceAmountPaidInInvoicesResult']);
          }

          if (!invoice.cltv_expiry) {
            return cbk([503, 'ExpectedCltvExpiryForInvoice']);
          }

          if (!isFinite(creationEpochDate)) {
            return cbk([503, 'ExpectedCreationDateForInvoice']);
          }

          if (!isFinite(expiresInMs)) {
            return cbk([503, 'ExpectedExpirationTimeInInvoice']);
          }

          if (!!descHash.length && !Buffer.isBuffer(invoice.description_hash)) {
            return cbk([503, 'ExpectedDescriptionHashBuffer']);
          }

          if (invoice.private === undefined) {
            return cbk([503, 'ExpectedInvoicePrivateStatus']);
          }

          if (!isString(invoice.payment_request)) {
            return cbk([503, 'ExpectedPaymentRequestInInvoice']);
          }

          if (!Buffer.isBuffer(invoice.r_preimage)) {
            return cbk([503, 'ExpectedPreimageInInvoice']);
          }

          if (!!invoice.settle_date) {
            const settledEpochDate = parseInt(invoice.settle_date, decBase);

            settledDate = new Date(settledEpochDate * msPerSec).toISOString();
          }

          if (!isBoolean(invoice.settled)) {
            return cbk([503, 'ExpectedInvoiceSettlementStatus', invoice]);
          }

          if (!isFinite(parseInt(invoice.value, decBase))) {
            return cbk([503, 'ExpectedTokenValue', invoice]);
          }

          const createTimeMs = creationEpochDate * msPerSec;
          let routes;

          try {
            routes = invoice.route_hints.map(route => {
              if (!isArray(route.hop_hints)) {
                throw new Error('ExpectedRouteHopHints');
              }

              return route.hop_hints.map(hop => {
                if (!hop.chan_id) {
                  throw new Error('ExpectedRouteHopChannelId');
                }

                if (hop.cltv_expiry_delta === undefined) {
                  throw new Error('ExpectedRouteHopCltvExpiryDelta');
                }

                if (!`${hop.fee_base_msat}`) {
                  throw new Error('ExpectedRouteHopBaseFee');
                }

                if (hop.fee_proportional_millionths === undefined) {
                  throw new Error('ExpectedRouteHopFeeRate');
                }

                if (!hop.node_id) {
                  throw new Error('ExpectedRouteHopPublicKey');
                }

                return {
                  base_fee_mtokens: hop.fee_base_msat,
                  channel: chanFormat({number: hop.chan_id}).channel,
                  cltv_delta: hop.cltv_expiry_delta,
                  fee_rate: hop.fee_proportional_millionths,
                  public_key: hop.node_id,
                };
              });
            });
          } catch (err) {
            return cbk([503, err.message]);
          }

          const memoHash = !descHash.length ? null : descHash.toString('hex');

          return cbk(null, {
            routes,
            chain_address: invoice.fallback_addr || undefined,
            cltv_delta: parseInt(invoice.cltv_expiry, decBase),
            confirmed_at: !!invoice.settled ? settledDate : undefined,
            created_at: new Date(createTimeMs).toISOString(),
            description: invoice.memo,
            description_hash: memoHash,
            expires_at: new Date(createTimeMs + expiresInMs).toISOString(),
            id: invoice.r_hash.toString('hex'),
            is_canceled: invoice.state === canceledState || undefined,
            is_confirmed: invoice.settled,
            is_held: invoice.state === acceptedState || undefined,
            is_private: !!invoice.private,
            mtokens: (BigInt(invoice.value) * mtokensPerToken).toString(),
            received: parseInt(invoice.amt_paid_sat, decBase),
            received_mtokens: invoice.amt_paid_msat,
            request: invoice.payment_request,
            secret: invoice.r_preimage.toString('hex'),
            tokens: parseInt(invoice.value, decBase),
          });
        },
        cbk);
      }],

      // Sorted invoices
      sortedInvoices: [
        'listInvoices',
        'mappedInvoices',
        ({listInvoices, mappedInvoices}, cbk) =>
      {
        return cbk(null, {
          invoices: sortBy(mappedInvoices, 'created_at').reverse(),
          next: !!mappedInvoices.length ? listInvoices.token : undefined,
        });
      }],
    },
    returnResult({reject, resolve, of: 'sortedInvoices'}, cbk));
  });
};
