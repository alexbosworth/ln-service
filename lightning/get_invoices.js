const {createHash} = require('crypto');

const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {isBoolean} = require('lodash');
const {isFinite} = require('lodash');
const {isString} = require('lodash');
const {sortBy} = require('lodash');

const {returnResult} = require('./../async-util');

const rowTypes = require('./conf/row_types');

const intBase = 10;
const msPerSec = 1e3;

/** Get all created invoices.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    invoices: [{
      chain_address: <Fallback Chain Address String>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      description_hash: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      id: <Payment Hash String>
      is_confirmed: <Invoice is Confirmed Bool>
      is_outgoing: <Invoice is Outgoing Bool>
      invoice: <Bolt 11 Invoice String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Validate arguments
    validate: cbk => {
      if (!lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      return cbk();
    },

    // Get the list of invoices
    listInvoices: ['validate', (_, cbk) => {
      return lnd.listInvoices({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'GetInvoiceErr', err]);
        }

        if (!res || !Array.isArray(res.invoices)) {
          return cbk([503, 'Expected invoices', res]);
        }

        return cbk(null, res.invoices);
      });
    }],

    // Mapped invoices
    mappedInvoices: ['listInvoices', ({listInvoices}, cbk) => {
      return asyncMap(listInvoices, (invoice, cbk) => {
        const creationEpochDate = parseInt(invoice.creation_date, intBase);
        const descHash = invoice.description_hash;
        const expiresInMs = parseInt(invoice.expiry, intBase) * msPerSec;
        let settledDate = undefined;

        if (!isFinite(creationEpochDate)) {
          return cbk([503, 'ExpectedCreationDate', invoice]);
        }

        if (!isFinite(expiresInMs)) {
          return cbk([503, 'ExpectedExpirationTime', invoice]);
        }

        if (!!descHash.length && !Buffer.isBuffer(invoice.description_hash)) {
          return cbk([503, 'ExpectedDescriptionHashBuffer', invoice]);
        }

        if (!isString(invoice.payment_request)) {
          return cbk([503, 'ExpectedPaymentRequest', invoice]);
        }

        if (!Buffer.isBuffer(invoice.r_preimage)) {
          return cbk([503, 'ExpectedPreimage', invoice]);
        }

        if (!!invoice.settle_date) {
          const settledEpochDate = parseInt(invoice.settle_date, intBase);

          settledDate = new Date(settledEpochDate).toISOString();
        }

        if (!isBoolean(invoice.settled)) {
          return cbk([503, 'ExpectedInvoiceSettlementStatus', invoice]);
        }

        if (!isFinite(parseInt(invoice.value, intBase))) {
          return cbk([503, 'ExpectedTokenValue', invoice]);
        }

        const createTime = creationEpochDate * msPerSec;

        return cbk(null, {
          chain_address: invoice.fallback_addr || null,
          confirmed_at: settledDate,
          created_at: new Date(createTime).toISOString(),
          description: invoice.memo,
          description_hash: !descHash.length ? null : descHash.toString('hex'),
          expires_at: new Date(createTime + expiresInMs).toISOString(),
          id: createHash('sha256').update(invoice.r_preimage).digest('hex'),
          is_confirmed: invoice.settled,
          is_outgoing: false,
          invoice: invoice.payment_request,
          tokens: parseInt(invoice.value, intBase),
          type: rowTypes.channel_transaction,
        });
      },
      cbk);
    }],

    // Sorted invoices
    sortedInvoices: ['mappedInvoices', ({mappedInvoices}, cbk) => {
      return cbk(null, {invoices: sortBy(mappedInvoices, 'created_at')});
    }],
  },
  returnResult({of: 'sortedInvoices'}, cbk));
};

