const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');
const {Transaction} = require('bitcoinjs-lib');

const {isLnd} = require('./../grpc');
const {isTransaction} = require('./../chain');

const bufFromHex = hex => Buffer.from(hex, 'hex');
const method = 'publishTransaction';
const type = 'wallet';

/** Publish a raw blockchain transaction to Blockchain network peers

  Requires LND built with `walletrpc` tag

  Requires `onchain:write` permission

  {
    [description]: <Transaction Label String>
    lnd: <Authenticated LND API Object>
    transaction: <Transaction Hex String>
  }

  @returns via cbk or Promise
  {
    id: <Transaction Id Hex String>
  }
*/
module.exports = ({description, lnd, transaction}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({lnd, method, type})) {
          return cbk([400, 'ExpectedWalletRpcLndToSendRawTransaction']);
        }

        if (!isTransaction({transaction})) {
          return cbk([400, 'ExpectedTransactionHexStringToBroadcastToPeers']);
        }

        return cbk();
      },

      // Publish transaction
      broadcast: ['validate', ({}, cbk) => {
        return lnd[type][method]({
          label: description || undefined,
          tx_hex: bufFromHex(transaction),
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
