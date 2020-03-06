const cancelHodlInvoice = require('./cancel_hodl_invoice');
const createHodlInvoice = require('./create_hodl_invoice');
const invoiceFromRpcInvoice = require('./invoice_from_rpc_invoice');
const settleHodlInvoice = require('./settle_hodl_invoice');
const subscribeToInvoice = require('./subscribe_to_invoice');

/** Methods for invoicerpc API
*/
module.exports = {
  cancelHodlInvoice,
  createHodlInvoice,
  invoiceFromRpcInvoice,
  settleHodlInvoice,
  subscribeToInvoice,
};
