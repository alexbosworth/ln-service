const asyncAuto = require('async/auto');

const {decodeInvoice} = require('./../lightning');
const {getInvoice} = require('./../lightning');
const {getWalletInfo} = require('./../lightning');
const {returnResult} = require('./../async-util');

const invoiceType = require('./../lightning').rowTypes.invoice;

/** Get payment request

  {
    invoice: <Bolt 11 Invoice String>
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    description: <Description String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    [is_confirmed]: <Settled Bool>
    [is_outgoing]: <Is Outgoing Bool>
    [payment_secret]: <Payment Secret String>
    tokens: <Token Amount Number>
    type: <Type String>
  }
*/
module.exports = ({invoice, lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!invoice) {
        return cbk([400, 'ExpectedInvoice']);
      }

      if (!lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      return cbk();
    },

    // Get the decoded invoice
    decodedInvoice: ['validate', (_, cbk) => {
      return decodeInvoice({lnd, invoice}, cbk);
    }],

    // Get wallet info
    getWalletInfo: ['validate', (_, cbk) => getWalletInfo({lnd}, cbk)],

    // Get extended invoice details from the db
    getInvoice: ['decodedInvoice', 'getWalletInfo', (res, cbk) => {
      const {destination} = res.decodedInvoice;
      const {id} = res.decodedInvoice;

      // Exit early when no information on the payment request is available.
      if (res.getWalletInfo.public_key !== destination) {
        return cbk(null, {});
      }

      return getInvoice({id, lnd}, cbk);
    }],

    // Final details about the invoice
    invoiceDetails: ['decodedInvoice', 'getInvoice', (res, cbk) => {
      return cbk(null, {
        description: res.decodedInvoice.description,
        destination: res.decodedInvoice.destination,
        expires_at: res.decodedInvoice.expires_at,
        id: res.decodedInvoice.id,
        is_confirmed: res.getInvoice.is_confirmed,
        is_outgoing: res.getInvoice.is_outgoing,
        payment_secret: res.getInvoice.payment_secret,
        tokens: res.decodedInvoice.tokens,
        type: invoiceType,
      });
    }],
  },
  returnResult({of: 'invoiceDetails'}, cbk));
};

