const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {returnResult} = require('asyncjs-util');

const decBase = 10;
const formats = {np2wpkh: 'NESTED_PUBKEY_HASH', p2wpkh: 'WITNESS_PUBKEY_HASH'};
const {isArray} = Array;
const {keys} = Object;
const maxConfs = 999999999;

/** Get unspent transaction outputs

  Requires `onchain:read` permission

  {
    lnd: <Authenticated LND API Object>
    [max_confirmations]: <Maximum Confirmations Number>
    [min_confirmations]: <Minimum Confirmations Number>
  }

  @returns via cbk or Promise
  {
    utxos: [{
      address: <Chain Address String>
      address_format: <Chain Address Format String>
      confirmation_count: <Confirmation Count Number>
      output_script: <Output Script Hex String>
      tokens: <Unspent Tokens Number>
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default || !args.lnd.default.listUnspent) {
          return cbk([400, 'ExpectedLndToGetUtxos']);
        }

        return cbk();
      },

      // Get UTXOs list
      getUtxos: ['validate', ({}, cbk) => {
        return args.lnd.default.listUnspent({
          max_confs: args.max_confirmations || maxConfs,
          min_confs: args.min_confirmations || Number(),
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingUnspentTxOutputs', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseForListUnspentRequest']);
          }

          if (!isArray(res.utxos)) {
            return cbk([503, 'ExpectedUtxosInListUnspentsResponse']);
          }

          return asyncMapSeries(res.utxos, (utxo, cbk) => {
            if (!utxo.address) {
              return cbk([503, 'ExpectedAddressInUtxoResponse']);
            }

            if (!utxo.address_type) {
              return cbk([503, 'ExpectedAddressTypeInListedUtxo']);
            }

            const addressFormat = keys(formats)
              .find(k => formats[k] === utxo.address_type);

            if (!addressFormat) {
              return cbk([503, 'UnexpectedAddressTypeInUtxoResponse']);
            }

            if (!utxo.amount_sat) {
              return cbk([503, 'ExpectedValueOfUnspentOutputInUtxosResponse']);
            }

            if (utxo.confirmations === undefined) {
              return cbk([503, 'ExpectedConfCountForUtxoInUtxoResponse']);
            }

            if (!utxo.outpoint) {
              return cbk([503, 'ExpectedOutpointForUtxoInUtxosResponse']);
            }

            if (utxo.outpoint.output_index === undefined) {
              return cbk([503, 'ExpectedOutpointIndexForUtxoInUtxosResponse']);
            }

            if (!utxo.outpoint.txid_str) {
              return cbk([503, 'ExpectedTransactionIdForUtxoInUtxosResponse']);
            }

            if (!utxo.pk_script) {
              return cbk([503, 'ExpectedScriptPubForUtxoInUtxosResponse']);
            }

            return cbk(null, {
              address: utxo.address,
              address_format: addressFormat,
              confirmation_count: parseInt(utxo.confirmations, decBase),
              output_script: utxo.pk_script,
              tokens: parseInt(utxo.amount_sat, decBase),
              transaction_id: utxo.outpoint.txid_str,
              transaction_vout: utxo.outpoint.output_index,
            });
          },
          cbk);
        });
      }],

      // Utxos
      utxos: ['getUtxos', ({getUtxos}, cbk) => cbk(null, {utxos: getUtxos})],
    },
    returnResult({reject, resolve, of: 'utxos'}, cbk));
  });
};
