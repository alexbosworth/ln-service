const htlcAsPayment = require('./htlc_as_payment');

const asMtok = tokens => (BigInt(tokens) * BigInt(1e3)).toString();
const defaultExpirySeconds = 60 * 60;
const {isArray} = Array;
const msPerSec = 1e3;

/** Invoice from RPC invoice

  {
    add_index: <Add Index String>
    amt_paid_msat: <Amount Paid Millitokens String>
    amt_paid_sat: <Amount Paid Tokens String>
    cltv_expiry: <Final CTLV Delta String>
    creation_date: <Invoice Created At Epoch Time String>
    description_hash: <Description Hash Buffer>
    expiry: <Invoice Expires In Seconds String>
    fallback_addr: <Fallback On-Chain Address String>
    htlcs: [{
      accept_height: <HTLC Held Since Height Number>
      accept_time: <HTLC Held Since Epoch Time Number String>
      amt_msat: <HTLC Amount Millitokens String>
      chan_id: <Numeric Channel Id String>
      expiry_height: <HTLC CLTV Expiration Height Number>
      htlc_index: <Channel HTLC Index Number String>
      resolve_time: <HTLC Removed At Epoch Time Number String>
      state: <HTLC Lifecycle State String>
    }]
    memo: <Invoice Memo String>
    payment_request: <Bolt 11 Payment Request String>
    r_hash: <Preimage Hash Buffer>
    r_preimage: <Preimage Buffer>
    settle_date: <Invoice Settled At Epoch Time String>
    settle_index: <Settle Index String>
    settled: <Is Settled Bool>
    state: <Invoice State String>
    value: <Tokens Value String>
    value_msat: <Millitokens Value String>
  }

  @throws
  <Error>

  @returns
  {
    [chain_address]: <Fallback Chain Address String>
    cltv_delta: <Final CLTV Delta Number>
    [confirmed_at]: <Confirmed At ISO 8601 Date String>
    [confirmed_index]: <Confirmed Index Number>
    created_at: <Created At ISO 8601 Date String>
    description: <Description String>
    description_hash: <Description Hash Hex String>
    expires_at: <Expires At ISO 8601 Date String>
    id: <Invoice Payment Hash Hex String>
    index: <Invoice Index Number>
    is_confirmed: <Invoice is Confirmed Bool>
    is_outgoing: <Invoice is Outgoing Bool>
    mtokens: <Invoiced Millitokens String>
    payments: [{
      [confirmed_at]: <Payment Settled At ISO 8601 Date String>
      created_at: <Payment Held Since ISO 860 Date String>
      created_height: <Payment Held Since Block Height Number>
      in_channel: <Incoming Payment Through Channel Id String>
      is_canceled: <Payment is Canceled Bool>
      is_confirmed: <Payment is Confirmed Bool>
      is_held: <Payment is Held Bool>
      mtokens: <Incoming Payment Millitokens String>
      [pending_index]: <Pending Payment Channel HTLC Index Number>
      tokens: <Payment TOkens Number>
    }]
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    request: <BOLT 11 Payment Request String>
    secret: <Payment Secret Hex String>
    tokens: <Invoiced Tokens Number>
  }
*/
module.exports = args => {
  if (!args) {
    throw new Error('ExpectedInvoice');
  }

  if (!args.add_index) {
    throw new Error('ExpectedInvoiceAddIndex');
  }

  if (!args.amt_paid_msat) {
    throw new Error('ExpectedInvoicePaidMsat');
  }

  if (!args.amt_paid_sat) {
    throw new Error('ExpectedInvoicePaidSat');
  }

  if (!args.cltv_expiry) {
    throw new Error('ExpectedInvoiceCltvExpiry')
  }

  if (!args.creation_date) {
    throw new Error('ExpectedInvoiceCreationDate');
  }

  if (!args.description_hash) {
    throw new Error('ExpectedInvoiceDescriptionHash');
  }

  const descriptionHash = args.description_hash;

  if (!!descriptionHash.length && !Buffer.isBuffer(descriptionHash)) {
    throw new Error('ExpectedInvoiceDescriptionHash');
  }

  if (!isArray(args.htlcs)) {
    throw new Error('ExpectedInvoiceHtlcs');
  }

  args.htlcs.forEach(htlc => htlcAsPayment(htlc));

  if (!Buffer.isBuffer(args.r_hash)) {
    throw new Error('ExpectedInvoiceHash');
  }

  if (!Buffer.isBuffer(args.r_preimage)) {
    throw new Error('ExpectedInvoicePreimage');
  }

  if (args.settled !== true && args.settled !== false) {
    throw new Error('ExpectedInvoiceSettled');
  }

  if (!args.settle_index) {
    throw new Error('ExpectedIndexOfInvoiceSettlement');
  }

  if (!args.value) {
    throw new Error('ExpectedInvoiceValue');
  }

  const createdAt = Number(args.creation_date);
  const hasMsat = !!args.value_msat && args.value_msat !== '0';
  const isSettled = args.settled;

  const confirmedAt = !isSettled ? null : Number(args.settle_date) * msPerSec;
  const confirmedIndex = Number(args.settle_index);
  const expiresAt = createdAt + Number(args.expiry || defaultExpirySeconds);

  const confirmed = !confirmedAt ? null : new Date(confirmedAt).toISOString();

  return {
    chain_address: args.fallback_addr || undefined,
    cltv_delta: Number(args.cltv_expiry),
    confirmed_at: confirmed || undefined,
    confirmed_index: confirmedIndex || undefined,
    created_at: new Date(createdAt * msPerSec).toISOString(),
    description: args.memo || '',
    description_hash: descriptionHash.toString('hex') || undefined,
    expires_at: new Date(expiresAt * msPerSec).toISOString(),
    id: args.r_hash.toString('hex'),
    index: Number(args.add_index),
    is_confirmed: args.settled,
    is_outgoing: false,
    mtokens: hasMsat ? args.value_msat : asMtok(args.value),
    payments: args.htlcs.map(htlcAsPayment),
    received: Number(args.amt_paid_sat),
    received_mtokens: args.amt_paid_msat,
    request: args.payment_request,
    secret: args.r_preimage.toString('hex'),
    tokens: Number(args.value),
  };
};
