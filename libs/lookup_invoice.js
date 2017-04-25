const rowTypes = require('./../config/row_types');

/** Lookup a channel invoice.

  {
    lnd_grpc_api: <Object>
    id: <RHash Identification String>
  }

  @returns via cbk
  {
    memo: <Description String>
    settled: <Finalized Bool>
    type: <Type String>
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
      type: rowTypes.channel_transaction,
    });
  });
};

