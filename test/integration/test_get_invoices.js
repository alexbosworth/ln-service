const {test} = require('tap');

const createInvoice = require('./../../createInvoice');
const getInvoices = require('./../../getInvoices');
const {spawnLnd} = require('./../macros');

const limit = 1;

// createInvoice should result in a created invoice
test(`Create an invoice`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const invoices = [
    await createInvoice({lnd, description: '3'}),
    await createInvoice({lnd, description: '2'}),
    await createInvoice({lnd, description: '1'}),
  ];

  invoices.reverse();

  const firstPage = await getInvoices({limit, lnd});

  equal(!!firstPage.next, true, 'First page has a next token');

  const secondPage = await getInvoices({lnd, token: firstPage.next});

  equal(!!secondPage.next, true, 'Second page has a next token');

  const thirdPage = await getInvoices({lnd, token: secondPage.next});

  equal(!!thirdPage.next, false, 'Third page has no next token');

  const receivedInvoices = []
    .concat(firstPage.invoices)
    .concat(secondPage.invoices)
    .concat(thirdPage.invoices);

  receivedInvoices.forEach((invoice, i) => {
    const expected = invoices[i];

    equal(invoice.chain_address, expected.chain_address, 'Chain address');
    equal(invoice.confirmed_at, expected.confirmed_at, 'Confirmed at');
    equal(invoice.id, expected.id, 'Invoice id');
    equal(invoice.request, expected.request, 'Payment request');
    equal(invoice.secret, expected.secret, 'Payment secret');
    equal(invoice.tokens, expected.tokens, 'Tokens');
  });

  kill();

  return end();
});

