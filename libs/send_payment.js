/** Send a payment

  {
    lnd_grpc_api: <Object>
    payment_request: <String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.payment_request) {
    return cbk([500, 'Missing lnd grpc api or payment request', args]);
  }

  return args.lnd_grpc_api.sendPaymentSync({
    payment_request: args.payment_request,
  },
  (err, response) => {
    if (!!err) { return cbk([500, 'Send payment error', err]); }

    return cbk();
  });
};

