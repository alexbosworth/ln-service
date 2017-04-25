const createHash = require('crypto').createHash;

const broadcastResponse = require('./broadcast_response');
const rowTypes = require('./../config/row_types');

/** Send a channel payment.

  {
    lnd_grpc_api: <Object>
    payment_request: <Serialized Payment Request String>
    wss: <Web Socket Server Object>
  }

  @returns via cbk
  [{
    confirmed: <Bool>
    destination: <Compressed Public Key String>
    fee: <Satoshis Number>
    hops: <Route Hops Number>
    id: <RHash Id String>
    outgoing: <Bool>
    tokens: <Satoshis Number>
    type: <Type String>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.payment_request) {
    return cbk([500, 'Missing lnd grpc api or payment request', args]);
  }

  if (!args.wss) { return cbk([500, 'Expected web socket server', args]); }

  return args.lnd_grpc_api.sendPaymentSync({
    payment_request: args.payment_request,
  },
  (err, res) => {
    if (!!err) { return cbk([500, 'Send payment err', err]); }

    const transaction = {
      confirmed: true,
      fee: parseInt(res.payment_route.total_fees),
      hops: res.payment_route.hops.length,
      id: createHash('sha256').update(res.payment_preimage).digest('hex'),
      outgoing: true,
      tokens: parseInt(res.payment_route.total_amt),
      type: rowTypes.channel_transaction,
    };

    broadcastResponse({clients: args.wss.clients, row: transaction});

    return cbk(null, transaction);
  });
};

