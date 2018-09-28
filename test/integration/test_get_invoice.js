const {test} = require('tap');

const createInvoice = require('./../../createInvoice');
const getInvoice = require('./../../getInvoice');
const {spawnLnd} = require('./../macros');

const description = 'description';
const secret = '0000000000000000000000000000000000000000000000000000000000000000';
const tokens = 42;

// getInvoice results in invoice details
test(`Get an invoice`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const {id} = await createInvoice({description, lnd, secret, tokens});

  const invoice = await getInvoice({id, lnd});

  equal(invoice.description, description, 'Invoice description');
  equal(invoice.secret, secret, 'Invoice secret');
  equal(invoice.tokens, tokens, 'Invoice tokens');

  kill();

  return end();
});

