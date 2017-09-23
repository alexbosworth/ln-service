const broadcastResponse = require('./broadcast_response');
const rowTypes = require('./../config/row_types');

const intBase = 10;

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Address String>
    lnd_grpc_api: <Object>
    tokens: <Satoshis Number>
    wss: <Web Socket Server Object>
  }

  @returns via cbk
  {
    confirmation_count: <Number>
    confirmed: <Bool>
    id: <Transaction Id String>
    outgoing: <Bool>
    tokens: <Tokens Number>
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

    console.log('SEND COINS RESPONSE', response);

    const transaction = {
      confirmation_count: 0,
      confirmed: false,
      id: response.txid,
      outgoing: true,
      tokens: parseInt(args.tokens, intBase),
      type: rowTypes.chain_transaction,
    };

    broadcastResponse({clients: args.wss.clients, row: transaction});

    return cbk(null, transaction);
  });
};

