const asyncMapSeries = require('async/mapSeries');

const decBase = 10;
const formats = {np2wpkh: 'NESTED_PUBKEY_HASH', p2wpkh: 'WITNESS_PUBKEY_HASH'};

/** Get unspent transaction outputs

  {
    lnd: <LND GRPC Object>
    [max_confirmations]: <Maximum Confirmations Number>
    [min_confirmations]: <Minimum Confirmations Number>
  }

  @returns via cbk
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
  if (!args.lnd) {
    return cbk([400, 'ExpectedLndToGetUtxos']);
  }

  return args.lnd.listUnspent({
    max_confs: args.max_confirmations || 9999,
    min_confs: args.min_confirmations || 0,
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingUnspentTransactionOutputs']);
    }

    if (!res) {
      return cbk([503, 'ExpectedResponseForListUnspentRequest']);
    }

    if (!Array.isArray(res.utxos)) {
      return cbk([503, 'ExpectedUtxosInListUnspentsResponse']);
    }

    return asyncMapSeries(res.utxos, (utxo, cbk) => {
      if (!utxo.address) {
        return cbk([503, 'ExpectedAddressInUtxoResponse']);
      }

      if (!utxo.type) {
        return cbk([503, 'ExpectedAddressTypeInListedUtxo']);
      }

      const addressFormat = Object.keys(formats).find(key => {
        return formats[key] === utxo.type;
      });

      if (!addressFormat) {
        return cbk([503, 'UnexpectedAddressTypeInUtxoResponse']);
      }

      if (!utxo.amount_sat) {
        return cbk([503, 'ExpectedValueOfUnspentOutputInUtxosResponse']);
      }

      if (utxo.confirmations === undefined) {
        return cbk([503, 'ExpectedConfirmationsCountForUtxoInUtxoResponse']);
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

      if (!utxo.script_pubkey) {
        return cbk([503, 'ExpectedScriptPubForUtxoInUtxosResponse']);
      }

      return cbk(null, {
        address: utxo.address,
        address_format: addressFormat,
        confirmation_count: parseInt(utxo.confirmations, decBase),
        output_script: utxo.script_pubkey,
        tokens: parseInt(utxo.amount_sat, decBase),
        transaction_id: utxo.outpoint.txid_str,
        transaction_vout: utxo.outpoint.output_index,
      });
    },
    (err, utxos) => {
      if (!!err) {
        return cbk(err);
      }

      return cbk(null, {utxos});
    });
  });
};
