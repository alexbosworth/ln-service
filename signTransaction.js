const {promisify} = require('util');

const {signTransaction} = require('./');

/** Sign transaction

  {
    inputs: [{
      key_family: <Key Family Number>
      key_index: <Key Index Number>
      output_script: <Output Script Hex String>
      output_tokens: <Output Tokens Number>
      sighash: <Sighash Type Number>
      vin: <Input Index To Sign Number>
      witness_script: <Witness Script Hex String>
    }]
    lnd: <LND Signer GRPC Object>
    transaction: <Unsigned Transaction Hex String>
  }

  @returns via Promise
  {
    signatures: [<Signature Hex String>]
  }
*/
module.exports = promisify(signTransaction);
