const cancelHodlInvoice = require('./cancel_hodl_invoice');
const createHodlInvoice = require('./create_hodl_invoice');
const settleHodlInvoice = require('./settle_hodl_invoice');
const subscribeToInvoice = require('./subscribe_to_invoice');

/** Methods for invoicerpc API
*/
module.exports = {
  cancelHodlInvoice,
  createHodlInvoice,
  settleHodlInvoice,
  subscribeToInvoice,
};
