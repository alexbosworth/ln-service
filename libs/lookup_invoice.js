/** Lookup an invoice

  {
    lnd_grpc_api: <Object>
    rhash: <String>
  }

  @returns via cbk
  {
    memo: <String>'
    settled: <Bool>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.rhash) {
    return cbk([500, 'Missing lnd grpc api or rhash', args]);
  }

  return args.lnd_grpc_api.lookupInvoice({
    r_hash_str: args.rhash,
  },
  (err, response) => {
    if (!!err) { return cbk([500, 'Lookup invoice error', err]); }

    if (response.memo === undefined) {
      return cbk([500, 'Missing memo', response]);
    }

    if (response.settled === undefined) {
      return cbk([500, 'Missing settled', response]);
    }

    return cbk(null, {
      memo: response.memo,
      settled: response.settled,
    });
  });
};

