const {Transaction} = require('bitcoinjs-lib');

/** Publish a raw blockchain transaction to Blockchain network peers

  {
    lnd: <WalletRPC LND GRPC API Object>
    transaction: <Transaction Hex String>
  }

  @returns via cbk
  {
    id: <Transaction Id Hex String>
  }
*/
module.exports = ({lnd, transaction}, cbk) => {
  if (!lnd || !lnd.publishTransaction) {
    return cbk([400, 'ExpectedWalletRpcLndToSendRawTransaction']);
  }

  if (!transaction) {
    return cbk([400, 'ExpectedRawTransactionToBroadcastToPeers']);
  }

  try {
    Transaction.fromHex(transaction);
  } catch (err) {
    return cbk([400, 'ExpectedValidTransactionToBroadcastToPeers']);
  }

  return lnd.publishTransaction({tx_hex: Buffer.from(transaction, 'hex')}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorBroadcastingRawTransaction', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResultOfBroadcastRawTransaction']);
    }

    if (!!res.publish_error) {
      return cbk([503, 'FailedToBroadcastRawTransaction', res.publish_error]);
    }

    return cbk(null, {id: Transaction.fromHex(transaction).getId()});
  });
};
