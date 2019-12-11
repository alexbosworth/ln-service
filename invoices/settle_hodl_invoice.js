const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const bufferFromHex = hex => Buffer.from(hex, 'hex');
const expectedSecretLen = 64;
const htlcNotYetAcceptedError = 'invoice still open';
const invalidSecretError = 'unable to locate invoice';

/** Settle hodl invoice

  requires lnd built with invoicesrpc build tag

  {
    lnd: <Authenticated LND gRPC API Object>
    secret: <Payment Preimage Hex String>
  }

  @returns via cbk or Promise
*/
module.exports = ({lnd, secret}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.invoices || !lnd.invoices.settleInvoice) {
          return cbk([400, 'ExpectedInvoicesLndToSettleHodlInvoice']);
        }

        if (!secret || !isHex(secret) || secret.length !== expectedSecretLen) {
          return cbk([400, 'ExpectedPaymentPreimageToSettleHodlInvoice']);
        }

        return cbk();
      },

      // Settle invoice
      settle: ['validate', ({}, cbk) => {
        return lnd.invoices.settleInvoice({
          preimage: bufferFromHex(secret),
        },
        err => {
          if (!!err && err.details === htlcNotYetAcceptedError) {
            return cbk([402, 'CannotSettleHtlcBeforeHtlcReceived']);
          }

          if (!!err && err.details === invalidSecretError) {
            return cbk([404, 'SecretDoesNotMatchAnyExistingHodlInvoice']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorWhenSettlingHodlInvoice', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
