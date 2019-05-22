const {promisify} = require('util');

const {getChainFeeRate} = require('./');

/** Get chain fee rate estimate

  {
    [confirmation_target]: <Future Blocks Confirmation Number>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via Promise
  {
    fee_tokens_per_vbyte: <Tokens Per Virtual Byte Number>
  }
*/
module.exports = promisify(getChainFeeRate);
