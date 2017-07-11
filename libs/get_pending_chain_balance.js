/** Get pending chain balance.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  <Pending Chain Balance Satoshis Number>
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.pendingChannels({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get pending channels error', err]); }

    if (!res || res.total_limbo_balance === undefined) {
      return cbk([500, 'Expected total limbo balance', res]);
    }

    return cbk(null, parseInt(res.total_limbo_balance));
  });
};

