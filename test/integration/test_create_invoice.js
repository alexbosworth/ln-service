const {test} = require('tap');

const createInvoice = require('./../../createInvoice');
const {spawnLnd} = require('./../macros');

// createInvoice should result in a created invoice
test(`Create an invoice`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const invoice = await createInvoice({lnd});

  equal(invoice.chain_address, undefined, 'Default address is undefined');
  equal(invoice.description, undefined, 'Default description is undefined');
  equal(invoice.tokens, 0, 'Default tokens are 0');
  equal(invoice.type, 'invoice', 'Invoice row type');

  const fancyInvoice = await createInvoice({
    lnd,
    is_including_private_channels: true,
  });

  kill();

  return end();
});

