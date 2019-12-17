const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');
const createChainAddress = require('./create_chain_address');
const getInvoice = require('./get_invoice');

const defaultExpiryMs = 1000 * 60 * 60 * 3;
const invoiceExistsError = 'invoice with payment hash already exists';
const {isArray} = Array;
const msPerSec = 1e3;
const {parse} = Date;
const {round} = Math;

/** Create a Lightning invoice.

  {
    [cltv_delta]: <CLTV Delta Number>
    [description]: <Invoice Description String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [is_fallback_included]: <Is Fallback Address Included Bool>
    [is_fallback_nested]: <Is Fallback Address Nested Bool>
    [is_including_private_channels]: <Invoice Includes Private Channels Bool>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function> // Required when WSS is passed
    [secret]: <Payment Secret Hex String>
    [tokens]: <Tokens Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk or Promise
  {
    [chain_address]: <Backup Address String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    id: <Payment Hash Hex String>
    mtokens: <Millitokens String>
    request: <BOLT 11 Encoded Payment Request String>
    secret: <Hex Encoded Payment Secret String>
    tokens: <Tokens Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Payment secret for the invoice
      preimage: cbk => {
        if (!args.secret) {
          return cbk();
        }

        if (!isHex(args.secret)) {
          return cbk([400, 'ExpectedHexSecretForNewInvoice']);
        }

        return cbk(null, Buffer.from(args.secret, 'hex'));
      },

      // Check arguments
      validate: cbk => {
        if (!!args.expires_at && new Date().toISOString() > args.expires_at) {
          return cbk([400, 'ExpectedFutureDateForInvoiceExpiration']);
        }

        if (!args.lnd) {
          return cbk([400, 'ExpectedLndToCreateNewInvoice']);
        }

        if (!!args.wss && !isArray(args.wss)) {
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

        return createChainAddress({format, lnd: args.lnd}, cbk);
      }],

      // Add invoice
      addInvoice: ['addAddress', 'preimage', ({addAddress, preimage}, cbk) => {
        const fallbackAddress = !addAddress ? '' : addAddress.address;
        const createdAt = new Date();
        const expireAt = !args.expires_at ? null : parse(args.expires_at);

        const expiryMs = !expireAt ? null : expireAt - createdAt.getTime();

        return args.lnd.default.addInvoice({
          cltv_expiry: !args.cltv_delta ? undefined : args.cltv_delta,
          expiry: !expiryMs ? defaultExpiryMs : round(expiryMs / msPerSec),
          fallback_addr: fallbackAddress,
          memo: args.description,
          private: !!args.is_including_private_channels,
          r_preimage: preimage || undefined,
          value: args.tokens || undefined,
        },
        (err, response) => {
          if (!!err && err.details === invoiceExistsError) {
            return cbk([409, 'InvoiceWithGivenHashAlreadyExists']);
          }

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
          });
        });
      }],

      // Get the invoice
      getInvoice: ['addInvoice', ({addInvoice}, cbk) => {
        return getInvoice({lnd: args.lnd, id: addInvoice.id}, cbk);
      }],

      // Final invoice
      invoice: [
        'addAddress',
        'addInvoice',
        'getInvoice',
        ({addAddress, addInvoice, getInvoice}, cbk) =>
      {
        return cbk(null, {
          chain_address: !addAddress ? undefined : addAddress.address,
          created_at: getInvoice.created_at,
          description: addInvoice.description,
          id: addInvoice.id,
          mtokens: getInvoice.mtokens,
          request: addInvoice.request,
          secret: getInvoice.secret,
          tokens: addInvoice.tokens || 0,
        });
      }],

      // Push row
      broadcast: ['invoice', ({invoice}, cbk) => {
        if (!!args.wss) {
          broadcastResponse({log: args.log, row: invoice, wss: args.wss});
        }

        return cbk();
      }],
    },
    returnResult({reject, resolve, of: 'invoice'}, cbk));
  });
};
