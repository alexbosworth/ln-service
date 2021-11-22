const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {parsePaymentRequest} = require('./../../');

// createInvoice should result in a created invoice
test(`Create an invoice`, async ({end, equal}) => {
  const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  await generate({count: 100});

  try {
    const invoice = await createInvoice({lnd});

    const parsed = parsePaymentRequest({request: invoice.request});

    equal(invoice.chain_address, undefined, 'Default address is undefined');
    equal(invoice.created_at, parsed.created_at, 'Invoice has created date');
    equal(invoice.description, undefined, 'Default description is undefined');
    equal(invoice.id, parsed.id, 'Invoice has id');
    equal(invoice.mtokens, '0', 'Default mtokens are 0');
    equal(!!invoice.request, true, 'Invoice has request');
    equal(!!invoice.secret, true, 'Invoice returns secret');
    equal(invoice.tokens, 0, 'Default tokens are 0');

    try {
      const duplicate = await createInvoice({lnd, secret: invoice.secret});

      equal(duplicate, null, 'Expected no duplicate invoice');
    } catch (err) {
      const [code, message] = err;

      equal(code, 409, 'Got expected error code');
      equal(message, 'InvoiceWithGivenHashAlreadyExists', 'Got expected msg');
    }

  } catch (err) {
    equal(err, null, 'Expected no error in create invoice');
  }

  await kill({});

  return end();
});
