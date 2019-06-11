const EventEmitter = require('events');

const decBase = 10;
const msPerSec = 1e3;

/** Subscribe to invoices

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'invoice_updated'
  {
    [confirmed_at]: <Confirmed At ISO 8601 Date String>
    created_at: <Created At ISO 8601 Date String>
    description: <Description String>
    expires_at: <Expires At ISO 8601 Date String>
    id: <Invoice Id Hex String>
    is_confirmed: <Invoice is Confirmed Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    secret: <Payment Secret Hex String>
    tokens: <Tokens Number>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default || !lnd.default.subscribeInvoices) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeInvoices');
  }

  const eventEmitter = new EventEmitter();
  const subscription = lnd.default.subscribeInvoices({});

  subscription.on('data', invoice => {
    if (!invoice) {
      return eventEmitter.emit('error', new Error('ExpectedInvoice'));
    }

    if (!invoice.amt_paid_msat) {
      return eventEmitter.emit('error', new Error('ExpectedInvoicePaidMsat'));
    }

    if (!invoice.amt_paid_sat) {
      return eventEmitter.emit('error', new Error('ExpectedInvoicePaidSat'));
    }

    if (!invoice.creation_date) {
      return eventEmitter.emit('error', new Error('ExpectedCreationDate'));
    }

    if (!invoice.description_hash) {
      return eventEmitter.emit('error', new Error('ExpectedDescriptionHash'));
    }

    const descriptionHash = invoice.description_hash;

    if (!!descriptionHash.length && !Buffer.isBuffer(descriptionHash)) {
      return eventEmitter.emit('error', new Error('ExpectedDescriptionHash'));
    }

    if (invoice.settled !== true && invoice.settled !== false) {
      return eventEmitter.emit('error', new Error('ExpectedInvoiceSettled'));
    }

    if (!Buffer.isBuffer(invoice.r_hash)) {
      return eventEmitter.emit('error', new Error('ExpectedInvoiceHash'));
    }

    if (!Buffer.isBuffer(invoice.r_preimage)) {
      return eventEmitter.emit('error', new Error('ExpectedInvoicePreimage'));
    }

    if (!!invoice.receipt.length && !Buffer.isBuffer(invoice.receipt)) {
      return eventEmitter.emit('error', new Error('ExpectedInvoiceReceipt'));
    }

    if (!invoice.value) {
      return eventEmitter.emit('error', new Error('ExpectedInvoiceValue'));
    }

    const confirmedAt = parseInt(invoice.settle_date, decBase) * msPerSec;
    const createdAt = parseInt(invoice.creation_date, decBase);

    const confirmed = new Date(confirmedAt).toISOString();
    const expiresAt = createdAt + parseInt(invoice.expiry);

    return eventEmitter.emit('invoice_updated', {
      confirmed_at: !invoice.settled ? undefined : confirmed,
      created_at: new Date(createdAt * msPerSec).toISOString(),
      description: invoice.memo || '',
      expires_at: new Date(expiresAt * msPerSec).toISOString(),
      id: invoice.r_hash.toString('hex'),
      is_confirmed: invoice.settled,
      is_outgoing: false,
      secret: invoice.r_preimage.toString('hex'),
      tokens: parseInt(invoice.value, decBase),
      received: parseInt(invoice.amt_paid_sat, decBase),
      received_mtokens: invoice.amt_paid_msat,
    });
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => eventEmitter.emit('error', err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
