const _ = require('lodash');

const intBase = 10;
const smallTokenUnitsPerBigUnit = 1e8;

/** Get balance on the chain.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  <Chain Balance Satoshis>
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.walletBalance({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get chain balance error', err]); }

    if (!res || res.balance === undefined) {
      return cbk([500, 'Expected balance', res]);
    }

    return cbk(null, parseInt(res.balance, intBase));
  });
};

