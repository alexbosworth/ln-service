const _ = require('lodash');
const smallTokenUnitsPerBigUnit = 100000000;

/** Get balance

  {
    lnd_grpc_api: <Object>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.walletBalance({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get chain balance error', err]); }

    if (!res || !_(res.balance).isNumber()) {
      return cbk([500, 'Expected balance', res]);
    }

    return cbk(null, res.balance * smallTokenUnitsPerBigUnit);
  });
};

