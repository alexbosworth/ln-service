const _ = require('lodash');
const createHash = require('crypto').createHash;

const rowTypes = require('./../config/row_types');

const intBase = 10;
const msPerSecond = 1000;

/** Get all created invoices.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  [{
    confirmed: <Bool>
    created_at: <Date String>
    id: <RHash String>
    memo: <String>
    outgoing: <Bool>
    payment_request: <Payment Request Hex Encoded String>
    tokens: <Satoshi Number>
    type: <Type String>
  }]
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.listInvoices({}, (err, res) => {
    if (!!err) { return cbk([500, 'Get invoices error', err]); }

    if (!res || !res.invoices) { return cbk([500, 'Expected invoices', res]); }

    // FIXME: - find any missing expected values, do this map async

    const invoices = res.invoices.map((invoice) => {
      const creationEpochDate = parseInt(invoice.creation_date, intBase);

      return {
        confirmed: invoice.settled,
        created_at: new Date(creationEpochDate * msPerSecond).toISOString(),
        id: createHash('sha256').update(invoice.r_preimage).digest('hex'),
        memo: invoice.memo,
        outgoing: false,
        payment_request: invoice.payment_request,
        tokens: parseInt(invoice.value, intBase),
        type: rowTypes.channel_transaction,
      };
    });

    return cbk(null, _.sortBy(invoices, 'created_at'));
  });
};

