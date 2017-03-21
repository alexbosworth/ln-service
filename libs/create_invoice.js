/** Create an invoice

  {
    amount: <Satoshis Number>
    lnd_grpc_api: <Object>
    memo: <Invoice Description String>
  }

  @returns via cbk
  {
    payment_request: <Hex Encoded Payment Request String>
    id: <Payment Request String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.amount) {
    return cbk([500, 'Missing lnd grpc api, or amount', args]);
  }

  return args.lnd_grpc_api.addInvoice({
    memo: args.memo,
    value: args.amount,
  },
  (err, response) => {
    if (!!err) { return cbk([500, 'Add invoice error', err]); }

    if (!response.payment_request) { return cbk([500, 'No payment request']); }

    if (!Buffer.isBuffer(response.r_hash)) {
      return cbk([500, 'Rhash is not a buffer']);
    }

    return cbk(null, {
      id: response.r_hash.toString('hex'),
      payment_request: response.payment_request,
    });
  });
};

