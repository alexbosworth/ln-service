const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {parsePaymentRequest} = require('./../../');

const count = 100;

// createInvoice should result in a created invoice
test(`Create an invoice`, async () => {
  const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  await generate({count});

  try {
    const invoice = await createInvoice({lnd});

    const parsed = parsePaymentRequest({request: invoice.request});

    strictEqual(invoice.chain_address, undefined, 'Address is undefined');
    strictEqual(invoice.created_at, parsed.created_at, 'Invoice created date');
    strictEqual(invoice.description, undefined, 'Description undefined');
    strictEqual(invoice.id, parsed.id, 'Invoice has id');
    strictEqual(invoice.mtokens, '0', 'Default mtokens are 0');
    strictEqual(!!invoice.request, true, 'Invoice has request');
    strictEqual(!!invoice.secret, true, 'Invoice returns secret');
    strictEqual(invoice.tokens, 0, 'Default tokens are 0');

    try {
      const duplicate = await createInvoice({lnd, secret: invoice.secret});

      equal(duplicate, null, 'Expected no duplicate invoice');
    } catch (err) {
      const [code, message] = err;

      strictEqual(code, 409, 'Got expected error code');
      strictEqual(message, 'InvoiceWithGivenHashAlreadyExists', 'Got msg');
    }

  } catch (err) {
    strictEqual(err, null, 'Expected no error in create invoice');
  }

  await kill({});

  return;
});
