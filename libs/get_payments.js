const msPerSecond = 1000;

/** Get payments

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    amount: <Satoshis Number>
    confirmed: <Bool>
    created_at: <ISO8601 Date String>
    destination: <Compressed Public Key String>
    fee: <Satoshis Number>
    hops: <Route Hops Number>
    id: <String> // rhash
    outgoing: <Bool>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.listPayments({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get payments error', err]); }

    if (!res || !res.payments) { return cbk([500, 'Expected payments', res]); }

    // FIXME: - find any missing expected values, do this map async

    const payments = res.payments.map((payment) => {
      const creationDate = parseInt(payment.creation_date) * msPerSecond;

      return {
        amount: parseInt(payment.value),
        confirmed: true,
        created_at: new Date(creationDate).toISOString(),
        destination: payment.path[payment.path.length - 1],
        fee: parseInt(payment.fee),
        hops: payment.path.length - 1,
        id: payment.payment_hash,
        outgoing: true,
      };
    });

    return cbk(null, payments);
  });
};

