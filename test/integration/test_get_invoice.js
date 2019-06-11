const {test} = require('tap');

const {createInvoice} = require('./../../');
const {getInvoice} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const description = 'description';
const secret = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f';
const tokens = 42;

// getInvoice results in invoice details
test(`Get an invoice`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const {id} = await createInvoice({description, lnd, secret, tokens});

  const invoice = await getInvoice({id, lnd});

  equal(invoice.description, description, 'Invoice description');
  equal(invoice.is_private, false, 'Invoice is public');
  equal(invoice.received, 0, 'Invoice received tokens');
  equal(invoice.received_mtokens, '0', 'Invoice received mtokens');
  equal(invoice.secret, secret, 'Invoice secret');
  equal(invoice.tokens, tokens, 'Invoice tokens');

  kill();

  await waitForTermination({lnd});

  return end();
});
