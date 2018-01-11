const asyncAuto = require('async/auto');

const broadcastResponse = require('./broadcast_response');
const createAddress = require('./create_address');
const lookupInvoice = require('./lookup_invoice');

const rowTypes = require('./../config/row_types');

/** Create a channel invoice.

  {
    include_address: <Return Backup Chain Address Bool>
    lnd_grpc_api: <Object>
    memo: <Invoice Description String>
    tokens: <Satoshis Number>
    wss: <Web Socket Server Object>
  }

  @returns via cbk
  {
    [chain_address]: <Backup Address String>
    created_at: <ISO 8601 Date String>
    id: <Payment Request Id String>
    memo: <Description String>
    payment_request: <Hex Encoded Payment Request String>
    payment_secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) {
    return cbk([500, 'Missing lnd grpc api, or tokens', args]);
  }

  return asyncAuto({
    validate: (cbk) => {
      if (!args.tokens) {
        return cbk([400, 'Expected tokens']);
      }

      return cbk();
    },

    addAddress: ['validate', (res, cbk) => {
      if (!args.include_address) {
        return cbk();
      }

      return createAddress({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    }],

    addInvoice: ['addAddress', 'validate', (res, cbk) => {
      const fallbackAddr = !res.addAddress ? '' : res.addAddress.address;
      const createdAt = new Date().toISOString();

      return args.lnd_grpc_api.addInvoice({
        fallback_addr: fallbackAddr,
        memo: args.memo,
        value: args.tokens,
      },
      (err, response) => {
        if (!!err) {
          return cbk([500, 'Add invoice error', err]);
        }

        if (!response.payment_request) {
          return cbk([500, 'No payment request']);
        }

        if (!Buffer.isBuffer(response.r_hash)) {
          return cbk([500, 'Rhash is not a buffer']);
        }

        return cbk(null, {
          created_at: createdAt,
          id: response.r_hash.toString('hex'),
          memo: args.memo,
          payment_request: response.payment_request,
          tokens: args.tokens,
          type: rowTypes.payment_request,
        });
      });
    }],

    lookupInvoice: ['addInvoice', (res, cbk) => {
      return lookupInvoice({
        id: res.addInvoice.id,
        lnd_grpc_api: args.lnd_grpc_api,
      },
      cbk);
    }],

    invoice: ['addAddress', 'addInvoice', 'lookupInvoice', (res, cbk) => {
      return cbk(null, {
        chain_address: !res.addAddress ? undefined : res.addAddress.address,
        created_at: res.addInvoice.created_at,
        id: res.addInvoice.id,
        memo: res.addInvoice.memo,
        payment_request: res.addInvoice.payment_request,
        payment_secret: res.lookupInvoice.payment_secret,
        tokens: res.addInvoice.tokens,
        type: res.addInvoice.type,
      });
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    broadcastResponse({clients: args.wss.clients, row: res.invoice});

    return cbk(null, res.invoice);
  });
};

