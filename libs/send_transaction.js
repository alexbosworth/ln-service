const rowTypes = require('./../config/row_types');

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Address String>
    lnd_grpc_api: <Object>
    tokens: <Satoshis Number>
  }

  @returns via cbk
  {
    id: <Transaction Id String>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing grpc api', args]); }

  if (!args.address) { return cbk([400, 'Missing address']); }

  if (!args.tokens) { return cbk([400, 'Missing tokens']); }

  return args.lnd_grpc_api.sendCoins({
    addr: args.address,
    amount: args.tokens,
  },
  (err, response) => {
    if (!!err) { return cbk([500, 'Send coins error', err]); }

    if (!response || !response.txid) {
      return cbk([500, 'Expected transaction id', response]);
    }

    return cbk(null, {id: response.txid, type: rowTypes.chain_transaction});
  });
};

