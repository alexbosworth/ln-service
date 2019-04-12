/** Settle hodl invoice

  {
    lnd: <Invoices RPC LND GRPC API Object>
    secret: <Payment Preimage Hex String>
  }
*/
module.exports = ({lnd, secret}, cbk) => {
  if (!lnd) {
    return cbk([400, 'ExpectedInvoicesLndToAcceptHodlInvoice']);
  }

  if (!secret) {
    return cbk([400, 'ExpectedPaymentSecretPreimageToAcceptHodlInvoice']);
  }

  return lnd.settleInvoice({preimage: Buffer.from(secret, 'hex')}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorWhenAcceptingHodlInvoice', err]);
    }

    return cbk();
  });
};
