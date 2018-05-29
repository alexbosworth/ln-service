const asyncAuto = require('async/auto');

const {broadcastResponse} = require('./../async-util');
const createAddress = require('./create_address');
const getInvoice = require('./get_invoice');

const msPerSec = 1e3;
const rowTypes = require('./conf/row_types');

/** Create a channel invoice.

  {
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [include_address]: <Return Backup Chain Address Bool>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
    payment_secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
    [wss]: [<Web Socket Server Object>]
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
    // Payment secret for the invoice
    preimage: cbk => {
      if (!args.payment_secret) {
        return cbk();
      }

      return cbk(null, Buffer.from(args.payment_secret, 'hex'));
    },

    // Check arguments
    validate: cbk => {
      if (!args.lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      if (!args.tokens) {
        return cbk([400, 'ExpectedTokens']);
      }

      if (!!args.wss && !Array.isArray(args.wss)) {
        return cbk([500, 'ExpectedWssArray']);
      }

      if (!!args.wss && !args.log) {
        return cbk([500, 'ExpectedLogFunction']);
      }

      return cbk();
    },

    // Add address for the fallback address
    addAddress: ['validate', async ({}, cbk) => {
      const {lnd} = args;

      if(!args.include_address) {
        return cbk();
      } else{
        const address = await createAddress({lnd});
        return cbk(null, address);
      } 
    }],

    // Add invoice
    addInvoice: ['addAddress', 'preimage', ({addAddress, preimage}, cbk) => {
      const fallbackAddr = !addAddress ? '' : addAddress.address;
      const createdAt = new Date();
      const expireAt = !args.expires_at ? null : Date.parse(args.expires_at);

      const expiryMs = !expireAt ? null : expireAt - createdAt.getTime();

      return args.lnd.addInvoice({
        expiry: !expiryMs ? undefined : Math.round(expiryMs / msPerSec),
        fallback_addr: fallbackAddr,
        memo: args.description,
        r_preimage: preimage || undefined,
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
          created_at: createdAt.toISOString(),
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

    if (!!args.wss) {
      broadcastResponse({log: args.log, row: res.invoice, wss: args.wss});
    }

    return cbk(null, res.invoice);
  });
};
