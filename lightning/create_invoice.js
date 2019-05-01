const asyncAuto = require('async/auto');

const {broadcastResponse} = require('./../async-util');
const createChainAddress = require('./create_chain_address');
const getInvoice = require('./get_invoice');
const rowTypes = require('./conf/row_types');

const msPerSec = 1e3;

/** Create a channel invoice.

  {
    [cltv_delta]: <CLTV Delta Number>
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [is_fallback_included]: <Is Fallback Address Included Bool>
    [is_fallback_nested]: <Is Fallback Address Nested Bool>
    [is_including_private_channels]: <Invoice Includes Private Channels Bool>
    lnd: <LND GRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
    [secret]: <Payment Secret Hex String>
    [tokens]: <Tokens Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk
  {
    [chain_address]: <Backup Address String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    id: <Payment Hash Hex String>
    request: <BOLT 11 Encoded Payment Request String>
    secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Payment secret for the invoice
    preimage: cbk => {
      if (!args.secret) {
        return cbk();
      }

      return cbk(null, Buffer.from(args.secret, 'hex'));
    },

    // Check arguments
    validate: cbk => {
      if (!args.lnd) {
        return cbk([400, 'ExpectedLndToCreateInvoice']);
      }

      if (!!args.wss && !Array.isArray(args.wss)) {
        return cbk([400, 'ExpectedWssArrayToCreateInvoice']);
      }

      if (!!args.wss && !args.log) {
        return cbk([400, 'ExpectedLogFunctionToCreateInvoice']);
      }

      return cbk();
    },

    // Add address for the fallback address
    addAddress: ['validate', ({}, cbk) => {
      // Exit early when no fallback address is needed
      if (!args.is_fallback_included) {
        return cbk();
      }

      const format = !!args.is_fallback_nested ? 'np2wpkh' : 'p2wpkh';
      const {lnd} = args;

      if (!args.include_address) {
        return cbk();
      }

      return createChainAddress({format, lnd}, cbk);
    }],

    // Add invoice
    addInvoice: ['addAddress', 'preimage', ({addAddress, preimage}, cbk) => {
      const fallbackAddress = !addAddress ? '' : addAddress.address;
      const createdAt = new Date();
      const expireAt = !args.expires_at ? null : Date.parse(args.expires_at);

      const expiryMs = !expireAt ? null : expireAt - createdAt.getTime();

      return args.lnd.addInvoice({
        cltv_expiry: !args.cltv_delta ? undefined : args.cltv_delta,
        expiry: !expiryMs ? undefined : Math.round(expiryMs / msPerSec),
        fallback_addr: fallbackAddress,
        memo: args.description,
        private: !!args.is_including_private_channels,
        r_preimage: preimage || undefined,
        value: args.tokens || undefined,
      },
      (err, response) => {
        if (!!err) {
          return cbk([503, 'AddInvoiceError', err]);
        }

        if (!response.payment_request) {
          return cbk([503, 'ExpectedPaymentRequestForCreatedInvoice']);
        }

        if (!Buffer.isBuffer(response.r_hash)) {
          return cbk([503, 'ExpectedPaymentHash']);
        }

        return cbk(null, {
          created_at: createdAt.toISOString(),
          description: args.description,
          id: response.r_hash.toString('hex'),
          request: response.payment_request,
          tokens: args.tokens || 0,
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
        request: res.addInvoice.request,
        secret: res.getInvoice.secret,
        tokens: res.addInvoice.tokens || 0,
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
