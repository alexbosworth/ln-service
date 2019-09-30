const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const bufferFromHex = hex => Buffer.from(hex, 'hex');

/** Cancel an invoice

  This call can cancel both HODL invoices and also void regular invoices

  Requires lnd built with invoicesrpc

  {
    id: <Payment Preimage Hash Hex String>
    lnd: <Authenticated RPC LND gRPC API Object>
  }

  @returns via cbk or Promise
*/
module.exports = ({id, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!id || !isHex(id)) {
          return cbk([400, 'ExpectedIdOfInvoiceToCancel']);
        }

        if (!lnd || !lnd.invoices || !lnd.invoices.cancelInvoice) {
          return cbk([400, 'ExpectedInvoicesLndGrpcApiToCancelHodlInvoice']);
        }

        return cbk();
      },

      // Cancel invoice
      cancel: ['validate', ({}, cbk) => {
        const paymentHash = bufferFromHex(id);

        return lnd.invoices.cancelInvoice({payment_hash: paymentHash}, err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorCancelingHodlInvoice', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
