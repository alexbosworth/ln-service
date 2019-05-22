const isHex = require('is-hex');

const bufferFromHex = hex => Buffer.from(hex, 'hex');
const expectedSecretHexLength = 64;

/** Settle hodl invoice

  {
    lnd: <Authenticated LND gRPC API Object>
    secret: <Payment Preimage Hex String>
  }
*/
module.exports = ({lnd, secret}, cbk) => {
  if (!lnd || !lnd.invoices || !lnd.invoices.settleInvoice) {
    return cbk([400, 'ExpectedInvoicesLndToSettleHodlInvoice']);
  }

  if (!secret || !isHex(secret) || secret.length !== expectedSecretHexLength) {
    return cbk([400, 'ExpectedPaymentSecretPreimageToSettleHodlInvoice']);
  }

  return lnd.invoices.settleInvoice({preimage: bufferFromHex(secret)}, err => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorWhenSettlingHodlInvoice', {err}]);
    }

    return cbk();
  });
};
