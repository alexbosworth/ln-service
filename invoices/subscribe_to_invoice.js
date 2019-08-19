const EventEmitter = require('events');

const isHex = require('is-hex');

const decBase = 10;
const msPerSec = 1e3;

/** Subscribe to an invoice

  Lnd built with invoicesrpc tag is required

  {
    id: <Invoice Payment Preimage Hash Hex String>
    lnd: <Authenticated LND gRPC API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event `invoice_updated`
  {
    chain_address: <Fallback Chain Address String>
    [confirmed_at]: <Settled at ISO 8601 Date String>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    description_hash: <Description Hash Hex String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Hash String>
    [is_canceled]: <Invoice is Canceled Bool>
    is_confirmed: <Invoice is Confirmed Bool>
    [is_held]: <HTLC is Held Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    is_private: <Invoice is Private Bool>
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <Bolt 11 Invoice String>
    routes: [[{
      base_fee_mtokens: <Base Routing Fee In Millitokens Number>
      channel: <Standard Format Channel Id String>
      cltv_delta: <CLTV Blocks Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]]
    secret: <Secret Preimage Hex String>
    tokens: <Tokens Number>
  }
*/
module.exports = ({id, lnd}) => {
  if (!id || !isHex(id)) {
    throw new Error('ExpectedIdOfInvoiceToSubscribeTo');
  }

  if (!lnd || !lnd.invoices.subscribeSingleInvoice) {
    throw new Error('ExpectedInvoiceLndToSubscribeToSingleInvoice');
  }

  const eventEmitter = new EventEmitter();

  const subscription = lnd.invoices.subscribeSingleInvoice({
    r_hash: Buffer.from(id, 'hex'),
  });

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
      cltv_delta: parseInt(invoice.cltv_expiry, decBase),
      confirmed_at: !invoice.settled ? undefined : confirmed,
      created_at: new Date(createdAt * msPerSec).toISOString(),
      description: invoice.memo || '',
      expires_at: new Date(expiresAt * msPerSec).toISOString(),
      id: invoice.r_hash.toString('hex'),
      is_canceled: invoice.state === 'CANCELED' || undefined,
      is_confirmed: invoice.settled,
      is_held: invoice.state === 'ACCEPTED' || undefined,
      is_outgoing: false,
      is_private: invoice.private,
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
