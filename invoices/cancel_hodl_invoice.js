const isHex = require('is-hex');

const bufferFromHex = hex => Buffer.from(hex, 'hex');

/** Cancel back an invoice

  {
    id: <Payment Hash Hex String>
    lnd: <Authenticated RPC LND gRPC API Object>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  if (!id || !isHex(id)) {
    return cbk([400, 'ExpectedIdOfHodlInvoiceToCancel']);
  }

  if (!lnd || !lnd.invoices || !lnd.invoices.cancelInvoice) {
    return cbk([400, 'ExpectedInvoicesLndGrpcApiToCancelHodlInvoice']);
  }

  return lnd.invoices.cancelInvoice({payment_hash: bufferFromHex(id)}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorCancelingHodlInvoice', {err}]);
    }

    return cbk();
  });
};
