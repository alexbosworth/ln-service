const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {parsePaymentRequest} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

// createInvoice should result in a created invoice
test(`Create an invoice`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const invoice = await createInvoice({lnd});

  const parsed = parsePaymentRequest({request: invoice.request});

  equal(invoice.chain_address, undefined, 'Default address is undefined');
  equal(invoice.created_at, parsed.created_at, 'Invoice has created at date');
  equal(invoice.description, undefined, 'Default description is undefined');
  equal(invoice.id, parsed.id, 'Invoice has id');
  equal(invoice.mtokens, '0', 'Default mtokens are 0');
  equal(!!invoice.request, true, 'Invoice has request');
  equal(!!invoice.secret, true, 'Invoice returns secret');
  equal(invoice.tokens, 0, 'Default tokens are 0');

  await createInvoice({lnd, is_including_private_channels: true});

  try {
    await createInvoice({lnd, secret: invoice.secret});
  } catch (err) {
    const [code, message] = err;

    equal(code, 409, 'Got expected error code');
    equal(message, 'InvoiceWithGivenHashAlreadyExists', 'Got expected msg');
  }

  kill();

  await waitForTermination({lnd});

  return end();
});
