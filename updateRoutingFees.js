const {promisify} = require('util');

const {updateRoutingFees} = require('./');

/** Update routing fees on a single channel or on all channels

  {
    [base_fee_tokens]: <Base Fee Charged Tokens Number>
    [cltv_delta]: <CLTV Delta Number>
    [fee_rate]: <Fee Rate In Millitokens Per Million Number>
    lnd: <Authenticated LND gRPC API Object>
    [transaction_id]: <Channel Transaction Id String>
    [transaction_vout]: <Channel Transaction Output Index Number>
  }
*/
module.exports = promisify(updateRoutingFees);
