const {promisify} = require('util');

const {getFeeRates} = require('./lightning');

/** Get a rundown on fees for channels

  {
    lnd: <LND GRPC API Object>
  }

  @returns via Promise
  {
    channels: [{
      base_fee: <Base Flat Fee in Tokens Number>
      fee_rate: <Fee Rate In Tokens Per Million Number>
      output_index: <Funding Outpoint Output Index Number>
      transaction_id: <Channel Funding Transaction Id Hex String>
    }]
  }
*/
module.exports = promisify(getFeeRates);

