const _ = require('lodash');

/** Get balance

  {
    lnd_grpc_api: <Object>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.channelBalance({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get channel balance error', err]); }

    if (!res || res.balance === undefined) {
      return cbk([500, 'Expected channel balance', res]);
    }

    return cbk(null, parseInt(res.balance));
  });
};

