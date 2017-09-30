const asyncAuto = require('async/auto');

const broadcastResponse = require('./broadcast_response');
const createAddress = require('./create_address');
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
          description: args.description,
          id: response.r_hash.toString('hex'),
          memo: args.memo,
          payment_request: response.payment_request,
          tokens: args.tokens,
          type: rowTypes.payment_request,
        });
      });
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const invoice = res.addInvoice;

    broadcastResponse({clients: args.wss.clients, row: invoice});

    if (!res.addAddress) {
      return cbk(null, invoice);
    }

    return cbk(null, {
      chain_address: res.addAddress.address,
      created_at: invoice.created_at,
      id: invoice.id,
      memo: invoice.memo,
      payment_request: invoice.payment_request,
      tokens: invoice.tokens,
      type: invoice.type,
    });
  });
};

