const {promisify} = require('util');

const {getChainFeeEstimate} = require('./');

/** Get a chain fee estimate for a prospective chain send

  {
    lnd: <LND GRPC API Object>
    send_to: [{
      address: <Address String>
      tokens: <Tokens Number>
    }]
    [target_confirmations]: <Target Confirmations Number>
  }

  @returns via Promise
  {
    fee: <Total Fee Tokens Number>
    tokens_per_vbyte: <Fee Tokens Per VByte Number>
  }
*/
module.exports = promisify(getChainFeeEstimate);
