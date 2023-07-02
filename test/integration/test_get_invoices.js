const {deepStrictEqual} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncEach = require('async/each');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {cancelHodlInvoice} = require('./../../');
const {createInvoice} = require('./../../');
const {getInvoices} = require('./../../');

const limit = 1;

// createInvoice should result in a created invoice
test(`Create an invoice`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  try {
    const [{generate, lnd}] = nodes;

    const invoices = [
      await createInvoice({lnd, description: '3'}),
      await createInvoice({lnd, description: '2'}),
      await createInvoice({lnd, description: '1'}),
    ];

    invoices.reverse();

    const firstPage = await getInvoices({limit, lnd});

    strictEqual(!!firstPage.next, true, 'First page has a next token');

    const secondPage = await getInvoices({lnd, token: firstPage.next});

    strictEqual(!!secondPage.next, true, 'Second page has a next token');

    const thirdPage = await getInvoices({lnd, token: secondPage.next});

    strictEqual(!!thirdPage.next, false, 'Third page has no next token');

    const receivedInvoices = []
      .concat(firstPage.invoices)
      .concat(secondPage.invoices)
      .concat(thirdPage.invoices);

    receivedInvoices.forEach((invoice, i) => {
      const expected = invoices[i];

      strictEqual(invoice.chain_address, expected.chain_address, 'Address');
      strictEqual(invoice.confirmed_at, expected.confirmed_at, 'Confirmed at');
      strictEqual(invoice.id, expected.id, 'Invoice id');
      strictEqual(invoice.request, expected.request, 'Payment request');
      strictEqual(invoice.secret, expected.secret, 'Payment secret');
      strictEqual(invoice.tokens, expected.tokens, 'Tokens');
    });

    const reversed = invoices.slice().reverse();

    await asyncEach(reversed.filter((n, i) => !!i), async invoice => {
      return await cancelHodlInvoice({lnd, id: invoice.id});
    });

    const unconfirmed = await getInvoices({limit, lnd, is_unconfirmed: true});

    deepStrictEqual(unconfirmed, thirdPage, 'Pending invoices are ignored');
  } catch (err) {
    strictEqual(err, null, 'No error is expected');
  }

  await kill({});

  return;
});
