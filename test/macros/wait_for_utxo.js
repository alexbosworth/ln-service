const asyncRetry = require('async/retry');
const {Transaction} = require('bitcoinjs-lib');

const {getUtxos} = require('./../../');

const interval = retryCount => 50 * Math.pow(2, retryCount);
const times = 10;

/** Wait for lnd to get a UTXO

  {
    [confirmations]: <Confirmations Count Number>
    [id]: <Transaction Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [transaction]: <Raw Transaction Hex String>
  }

  @returns via cbk
  {
    address: <Chain Address String>
    address_format: <Chain Address Format String>
    confirmation_count: <Confirmation Count Number>
    output_script: <Output Script Hex String>
    tokens: <Unspent Tokens Number>
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
  }
*/
module.exports = ({confirmations, id, lnd, transaction}, cbk) => {
  if (!lnd || !lnd.default) {
    return cbk([400, 'ExpectedAuthenticatedLndToWaitForUtxo']);
  }

  if (!transaction && !id) {
    return cbk([400, 'ExpectedTransactionOrIdToWaitForUtxo']);
  }

  const txId = id || Transaction.fromHex(transaction).getId();

  return asyncRetry({interval, times}, cbk => {
    return getUtxos({lnd}, (err, res) => {
      if (!!err) {
        return cbk(err);
      }

      const utxo = res.utxos.find(n => n.transaction_id === txId);

      if (!utxo) {
        return cbk([503, 'ExpectedToFindUtxoButUtxoNotFound']);
      }

      if (!!confirmations && utxo.confirmation_count < confirmations) {
        return cbk([503, 'ExpectedMoreConfirmationsForUtxo']);
      }

      return cbk(null, {utxo});
    });
  },
  cbk);
};
