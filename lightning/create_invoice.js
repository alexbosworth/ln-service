const asyncAuto = require('async/auto');

const {broadcastResponse} = require('./../async-util');
const createAddress = require('./create_address');
const getInvoice = require('./get_invoice');

const rowTypes = require('./conf/row_types');

/** Create a channel invoice.

  {
    [description]: <Invoice Description String>
    [include_address]: <Return Backup Chain Address Bool>
    lnd: <LND GRPC API Object>
    tokens: <Tokens Number>
    wss: <Web Socket Server Object>
  }

  @returns via cbk
  {
    [chain_address]: <Backup Address String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    id: <Payment Request Id String>
    invoice: <Hex Encoded Invoice String>
    payment_secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      if (!args.tokens) {
        return cbk([400, 'ExpectedTokens']);
      }

      if (!args.wss) {
        return cbk([500, 'ExpectedWss']);
      }

      return cbk();
    },

    // Add address for the fallback address
    addAddress: ['validate', (_, cbk) => {
      const {lnd} = args;

      return !args.include_address ? cbk() : createAddress({lnd}, cbk);
    }],

    // Add invoice
    addInvoice: ['addAddress', ({addAddress}, cbk) => {
      const fallbackAddr = !addAddress ? '' : addAddress.address;
      const createdAt = new Date().toISOString();

      return args.lnd.addInvoice({
        fallback_addr: fallbackAddr,
        memo: args.description,
        value: args.tokens,
      },
      (err, response) => {
        if (!!err) {
          return cbk([503, 'AddInvoiceError', err]);
        }

        if (!response.payment_request) {
          return cbk([503, 'ExpectedPayReq']);
        }

        if (!Buffer.isBuffer(response.r_hash)) {
          return cbk([503, 'ExpectedPaymentHash']);
        }

        return cbk(null, {
          created_at: createdAt,
          description: args.description,
          id: response.r_hash.toString('hex'),
          invoice: response.payment_request,
          tokens: args.tokens,
          type: rowTypes.invoice,
        });
      });
    }],

    // Get the invoice
    getInvoice: ['addInvoice', ({addInvoice}, cbk) => {
      return getInvoice({lnd: args.lnd, id: addInvoice.id}, cbk);
    }],

    // Final invoice
    invoice: ['addAddress', 'addInvoice', 'getInvoice', (res, cbk) => {
      return cbk(null, {
        chain_address: !res.addAddress ? undefined : res.addAddress.address,
        created_at: res.addInvoice.created_at,
        description: res.addInvoice.description,
        id: res.addInvoice.id,
        invoice: res.addInvoice.invoice,
        payment_secret: res.getInvoice.payment_secret,
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

