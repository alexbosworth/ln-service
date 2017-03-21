const _ = require('lodash');

const msPerSecond = 1000;

/** Get invoices

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    amount: <Satoshi Number>
    confirmed: <Bool>
    created_at: <Date String>
    memo: <String>
    outgoing: <Bool>
    payment: <Payment Request Hex Encoded String>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.listInvoices({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get invoices error', err]); }

    if (!res || !res.invoices) { return cbk([500, 'Expected invoices', res]); }

    // FIXME: - find any missing expected values, do this map async

    const invoices = res.invoices.map((invoice) => {
      const creationDate = parseInt(invoice.creation_date) * msPerSecond;

      return {
        amount: parseInt(invoice.value),
        confirmed: invoice.settled,
        created_at: new Date(creationDate).toISOString(),
        memo: invoice.memo,
        outgoing: false,
        payment: invoice.payment_request,
      };
    });

    return cbk(null, _(invoices).sortBy('created_at'));
  });
};

