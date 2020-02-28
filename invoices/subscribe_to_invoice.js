const EventEmitter = require('events');

const {featureFlagDetails} = require('bolt09');

const htlcAsPayment = require('./htlc_as_payment');

const decBase = 10;
const isHash = n => /^[0-9A-F]{64}$/i.test(n);
const msPerSec = 1e3;

/** Subscribe to an invoice

  LND built with `invoicesrpc` tag is required

  The `payments` array of HTLCs is only populated on LND versions after 0.7.1

  The `features` and `messages` arrays are not populated on LND 0.8.2 and below
  The `mtokens` value is not supported on LND 0.8.2 and below

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
    features: [{
      bit: <BOLT 09 Feature Bit Number>
      is_known: <Feature is Known Bool>
      is_required: <Feature Support is Required To Pay Bool>
      type: <Feature Type String>
    }]
    id: <Payment Hash String>
    [is_canceled]: <Invoice is Canceled Bool>
    is_confirmed: <Invoice is Confirmed Bool>
    [is_held]: <HTLC is Held Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    is_private: <Invoice is Private Bool>
    mtokens: <Invoiced Millitokens String>
    [payments]: [{
      [confirmed_at]: <Payment Settled At ISO 8601 Date String>
      created_at: <Payment Held Since ISO 860 Date String>
      created_height: <Payment Held Since Block Height Number>
      in_channel: <Incoming Payment Through Channel Id String>
      is_canceled: <Payment is Canceled Bool>
      is_confirmed: <Payment is Confirmed Bool>
      is_held: <Payment is Held Bool>
      messages: [{
        type: <Message Type Number String>
        value: <Raw Value Hex String>
      }]
      mtokens: <Incoming Payment Millitokens String>
      [pending_index]: <Pending Payment Channel HTLC Index Number>
      tokens: <Payment Tokens Number>
      [total_mtokens]: <Total Payment Millitokens String>
    }]
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
  if (!id || !isHash(id)) {
    throw new Error('ExpectedIdOfInvoiceToSubscribeTo');
  }

  if (!lnd || !lnd.invoices || !lnd.invoices.subscribeSingleInvoice) {
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
      features: Object.keys(invoice.features).map(bit => ({
        bit: Number(bit),
        is_known: invoice.features[bit].is_known,
        is_required: invoice.features[bit].is_required,
        type: featureFlagDetails({bit}).type,
      })),
      id: invoice.r_hash.toString('hex'),
      is_canceled: invoice.state === 'CANCELED' || undefined,
      is_confirmed: invoice.settled,
      is_held: invoice.state === 'ACCEPTED' || undefined,
      is_outgoing: false,
      is_private: invoice.private,
      mtokens: invoice.value_msat !== '0' ? invoice.value_msat : undefined,
      payments: invoice.htlcs.map(htlcAsPayment),
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
