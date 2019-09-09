const cancelHodlInvoice = require('./cancel_hodl_invoice');
const createHodlInvoice = require('./create_hodl_invoice');
const htlcAsPayment = require('./htlc_as_payment');
const settleHodlInvoice = require('./settle_hodl_invoice');
const subscribeToInvoice = require('./subscribe_to_invoice');

/** Methods for invoicerpc API
*/
module.exports = {
  cancelHodlInvoice,
  createHodlInvoice,
  htlcAsPayment,
  settleHodlInvoice,
  subscribeToInvoice,
};
