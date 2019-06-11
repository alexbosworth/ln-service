const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');
const {Transaction} = require('bitcoinjs-lib');

/** Publish a raw blockchain transaction to Blockchain network peers

  Requires lnd built with `walletrpc` tag

  {
    lnd: <Authenticated LND gRPC API Object>
    transaction: <Transaction Hex String>
  }

  @returns via cbk or Promise
  {
    id: <Transaction Id Hex String>
  }
*/
module.exports = ({lnd, transaction}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.wallet || !lnd.wallet.publishTransaction) {
          return cbk([400, 'ExpectedWalletRpcLndToSendRawTransaction']);
        }

        if (!transaction || !isHex(transaction)) {
          return cbk([400, 'ExpectedRawTransactionToBroadcastToPeers']);
        }

        try {
          Transaction.fromHex(transaction);
        } catch (err) {
          return cbk([400, 'ExpectedValidTransactionToBroadcastToPeers']);
        }

        return cbk();
      },

      // Publish transaction
      broadcast: ['validate', ({}, cbk) => {
        return lnd.wallet.publishTransaction({
          tx_hex: Buffer.from(transaction, 'hex'),
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrBroadcastingRawTx', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultOfBroadcastRawTransaction']);
          }

          if (!!res.publish_error) {
            return cbk([503, 'FailedToBroadcastRawTransaction', {res}]);
          }

          return cbk(null, {id: Transaction.fromHex(transaction).getId()});
        });
      }],
    },
    returnResult({reject, resolve, of: 'broadcast'}, cbk));
  });
};
