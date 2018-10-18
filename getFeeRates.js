const {promisify} = require('util');

const {getFeeRates} = require('./');

/** Get a rundown on fees for channels

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    channels: [{
      base_fee: <Base Flat Fee in Tokens Number>
      fee_rate: <Fee Rate In Tokens Per Million Number>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Funding Outpoint Output Index Number>
    }]
  }
*/
module.exports = promisify(getFeeRates);

