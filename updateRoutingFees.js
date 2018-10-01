const {promisify} = require('util');

const {updateRoutingFees} = require('./');

/** Update routing fees on a single channel or on all channels

  {
    [base_fee_tokens]: <Base Fee Charged Tokens Number> // default: 1
    [cltv_delta]: <CLTV Delta Number> // defaults to 144
    [fee_rate]: <Fee Rate In Millitokens Per Million Number> // default: 1
    lnd: <LND GRPC API Object>
    [transaction_id]: <Channel Transaction Id String>
    [transaction_vout]: <Channel Transaction Output Index Number>
  }
*/
module.exports = promisify(updateRoutingFees);

