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
    [address]: <Backup Address String>
    id: <Payment Request Id String>
    payment_request: <Hex Encoded Payment Request String>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    addAddress: (cbk) => {
      if (!args.include_address) { return cbk(); }

      return createAddress({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    addInvoice: (cbk) => {
      if (!args.lnd_grpc_api || !args.tokens) {
        return cbk([500, 'Missing lnd grpc api, or tokens', args]);
      }

      return args.lnd_grpc_api.addInvoice({
        memo: args.memo,
        value: args.tokens,
      },
      (err, response) => {
        if (!!err) { return cbk([500, 'Add invoice error', err]); }

        if (!response.payment_request) {
          return cbk([500, 'No payment request']);
        }

        if (!Buffer.isBuffer(response.r_hash)) {
          return cbk([500, 'Rhash is not a buffer']);
        }

        return cbk(null, {
          id: response.r_hash.toString('hex'),
          payment_request: response.payment_request,
          type: rowTypes.payment_request,
        });
      });
    },
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    const invoice = res.addInvoice;

    broadcastResponse({clients: args.wss.clients, row: invoice});

    if (!res.addAddress) { return cbk(null, invoice); }

    return cbk(null, {
      address: res.addAddress.address,
      id: invoice.id,
      payment_request: invoice.payment_request,
      type: invoice.type,
    });
  });
};

