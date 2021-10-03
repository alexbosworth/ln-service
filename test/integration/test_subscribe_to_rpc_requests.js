const {test} = require('@alexbosworth/tap');

const asyncRetry = require('async/retry');
const {createInvoice} = require('./../../');
const {getWalletInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {subscribeToInvoice} = require('./../../');
const {subscribeToRpcRequests} = require('./../../');
const {waitForTermination} = require('./../macros');

const subscribeInvoiceUri = '/invoicesrpc.Invoices/SubscribeSingleInvoice';

// Subscribing to RPC requests should listen for RPC requests
test(`Subscribe to RPC requests`, async ({end, equal, fail, strictSame}) => {
  const spawned = await (async () => {
    try {
      return await spawnLnd({intercept: true});
    } catch (err) {
      return;
    }
  })();

  // LND 0.13.2 and below do not support rpc interception
  if (!spawned) {
    return end();
  }

  const {lnd} = spawned;
  const pubKey = spawned.public_key;

  const rpcRequestsSub = (await subscribeToRpcRequests({lnd})).subscription;

  const intercepted = [];

  rpcRequestsSub.on('error', error => intercepted.push({error}));
  rpcRequestsSub.on('request', request => intercepted.push({request}));
  rpcRequestsSub.on('response', response => intercepted.push({response}));

  const {id} = await createInvoice({lnd});

  const invoicesSub = subscribeToInvoice({id, lnd});

  invoicesSub.on('invoice_updated', update => {});

  await getWalletInfo({lnd});

  const requests = intercepted.filter(n => !!n.request).map(n => n.request);
  const responses = intercepted.map(n => n.response).filter(n => !!n);

  if (!requests.find(n => n.uri === '/lnrpc.Lightning/AddInvoice')) {
    fail('Expected add invoice request interception');
  }

  if (!responses.find(n => n.uri === '/lnrpc.Lightning/AddInvoice')) {
    fail('Expected add invoice response interception');
  }

  if (!requests.find(n => n.uri === '/lnrpc.Lightning/GetInfo')) {
    fail('Expected get wallet info request interception');
  }

  if (!responses.find(n => n.uri === '/lnrpc.Lightning/GetInfo')) {
    fail('Expected get wallet info response interception');
  }

  if (!requests.find(n => n.uri === subscribeInvoiceUri)) {
    fail('Expected invoice subscription interception');
  }

  if (!requests.find(n => n.uri === '/lnrpc.Lightning/LookupInvoice')) {
    fail('Expected get invoice interception');
  }

  if (!responses.find(n => n.uri === '/lnrpc.Lightning/LookupInvoice')) {
    fail('Expected get invoice response interception');
  }

  spawned.kill({});

  await waitForTermination({lnd});

  return end();
});
