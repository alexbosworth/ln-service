const {promisify} = require('util');

const {getUtxos} = require('./');

/** Get unspent transaction outputs

  {
    lnd: <Authenticated LND gRPC API Object>
    [max_confirmations]: <Maximum Confirmations Number>
    [min_confirmations]: <Minimum Confirmations Number>
  }

  @returns via Promise
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
module.exports = promisify(getUtxos);
