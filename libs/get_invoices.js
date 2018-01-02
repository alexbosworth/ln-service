const _ = require('lodash');
const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const createHash = require('crypto').createHash;

const rowTypes = require('./../config/row_types');

const intBase = 10;
const msPerSec = 1e3;

/** Get all created invoices.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    chain_address: <Fallback Chain Address String>
    confirmed: <Bool>
    created_at: <ISO 8601 Date String>
    expires_at: <ISO 8601 Date String>
    id: <RHash String>
    memo: <String>
    outgoing: <Bool>
    payment_request: <Payment Request Hex Encoded String>
    tokens: <Satoshi Number>
    type: <Type String>
  }]
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    validate: (cbk) => {
      if (!args.lnd_grpc_api) {
        return cbk([500, 'Missing lnd grpc api', args]);
      }

      return cbk();
    },

    listInvoices: ['validate', (res, cbk) => {
      return args.lnd_grpc_api.listInvoices({}, (err, res) => {
        if (!!err) {
          return cbk([500, 'Get invoices error', err]);
        }

        if (!res || !Array.isArray(res.invoices)) {
          return cbk([500, 'Expected invoices', res]);
        }

        return cbk(null, res.invoices);
      });
    }],

    invoices: ['listInvoices', (res, cbk) => {
      return asyncMap(res.listInvoices, (invoice, cbk) => {
        const creationEpochDate = parseInt(invoice.creation_date, intBase);
        const descHash = invoice.description_hash;
        const expiresInMs = parseInt(invoice.expiry, intBase) * msPerSec;

        if (!_.isFinite(creationEpochDate)) {
          return cbk([500, 'Expected creation epoch date', invoice]);
        }

        if (!_.isFinite(expiresInMs)) {
          return cbk([500, 'Expected expiration time', invoice]);
        }

        if (!_.isBuffer(invoice.description_hash)) {
          return cbk([500, 'Expected description hash buffer', invoice]);
        }

        if (!_.isString(invoice.payment_request)) {
          return cbk([500, 'Expected payment request', invoice]);
        }

        if (!_.isBuffer(invoice.r_preimage)) {
          return cbk([500, 'Expected r preimage', invoice]);
        }

        if (!_.isBoolean(invoice.settled)) {
          return cbk([500, 'Expected invoice settlement status', invoice]);
        }

        if (!_.isFinite(parseInt(invoice.value, intBase))) {
          return cbk([500, 'Expected token value', invoice]);
        }

        const createTime = creationEpochDate * msPerSec;

        return cbk(null, {
          chain_address: invoice.fallback_addr || null,
          confirmed: invoice.settled,
          created_at: new Date(createTime).toISOString(),
          description_hash: !descHash.length ? null : descHash.toString('hex'),
          expires_at: new Date(createTime + expiresInMs).toISOString(),
          id: createHash('sha256').update(invoice.r_preimage).digest('hex'),
          memo: invoice.memo,
          outgoing: false,
          payment_request: invoice.payment_request,
          tokens: parseInt(invoice.value, intBase),
          type: rowTypes.channel_transaction,
        });
      },
      cbk);
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, _.sortBy(res.invoices, 'created_at'));
  });
};

