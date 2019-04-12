/** Cancel back a hodl invoice

  {
    id: <Payment Hash Hex String>
    lnd: <Invoices RPC LND GRPC API Object>
  }
*/
module.exports = ({id, lnd}, cbk) => {
  if (!id) {
    return cbk([400, 'ExpectedIdOfHodlInvoiceToCancel']);
  }

  if (!lnd || !lnd.cancelInvoice) {
    return cbk([400, 'ExpectedInvoicesLndGrpcApiToCancelHodlInvoice']);
  }

  return lnd.cancelInvoice({payment_hash: Buffer.from(id, 'hex')}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorCancelingHodlInvoice', err]);
    }

    return cbk();
  });
};
