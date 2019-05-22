const asyncAuto = require('async/auto');
const isHex = require('is-hex');

const {broadcastResponse} = require('./../async-util');
const {createChainAddress} = require('./../lightning');

const {isArray} = Array;
const msPerSec = 1e3;
const noTokens = 0;
const {parse} = Date;
const {round} = Math;
const rowType = 'invoice';

/** Create hodl invoice. This invoice will not settle automatically when an
    HTLC arrives. It must be settled separately with a preimage.

  {
    [cltv_delta]: <CLTV Delta Number>
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    id: <Payment Hash Hex String>
    [internal_description]: <Internal Description String>
    [is_fallback_included]: <Is Fallback Address Included Bool>
    [is_fallback_nested]: <Is Fallback Address Nested Bool>
    [is_including_private_channels]: <Invoice Includes Private Channels Bool>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
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
    // Check arguments
    validate: cbk => {
      if (!args.id || !isHex(args.id)) {
        return cbk([400, 'ExpectedInvoiceIdForNewHodlInvoice']);
      }

      if (!args.lnd || !args.lnd.invoices) {
        return cbk([400, 'ExpectedInvoicesLndToCreateHodlInvoice']);
      }

      if (!!args.wss && !isArray(args.wss)) {
        return cbk([400, 'ExpectedWssArrayForCreateHodlInvoice']);
      }

      if (!!args.wss && !args.log) {
        return cbk([400, 'ExpectedLogFunctionForCreateHodlInvoice']);
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

      return createChainAddress({format, lnd: args.lnd}, cbk);
    }],

    // Add invoice
    addInvoice: ['addAddress', ({addAddress}, cbk) => {
      const fallbackAddress = !addAddress ? undefined : addAddress.address;
      const createdAt = new Date();
      const expireAt = !args.expires_at ? null : parse(args.expires_at);

      const expiryMs = !expireAt ? null : expireAt - createdAt.getTime();

      return args.lnd.invoices.addHoldInvoice({
        cltv_expiry: !args.cltv_delta ? undefined : args.cltv_delta,
        expiry: !expiryMs ? undefined : round(expiryMs / msPerSec),
        fallback_addr: fallbackAddress,
        hash: Buffer.from(args.id, 'hex'),
        memo: args.description,
        private: !!args.is_including_private_channels,
        value: args.tokens || undefined,
      },
      (err, response) => {
        if (!!err) {
          return cbk([503, 'AddHodlInvoiceError', err]);
        }

        if (!response.payment_request) {
          return cbk([503, 'ExpectedPaymentRequestForCreatedInvoice']);
        }

        return cbk(null, {
          created_at: createdAt.toISOString(),
          description: args.description || undefined,
          id: args.id,
          request: response.payment_request,
          tokens: args.tokens || noTokens,
          type: rowType,
        });
      });
    }],

    // Final invoice
    invoice: ['addAddress', 'addInvoice', (res, cbk) => {
      return cbk(null, {
        chain_address: !res.addAddress ? undefined : res.addAddress.address,
        created_at: res.addInvoice.created_at,
        description: res.addInvoice.description,
        id: res.addInvoice.id,
        request: res.addInvoice.request,
        tokens: res.addInvoice.tokens,
        type: rowType,
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
