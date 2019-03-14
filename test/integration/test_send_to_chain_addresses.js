const {address} = require('bitcoinjs-lib');
const {test} = require('tap');

const createChainAddress = require('./../../createChainAddress');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getChainBalance = require('./../../getChainBalance');
const sendToChainAddresses = require('./../../sendToChainAddresses');

const chainAddressRowType = 'chain_address';
const confirmationCount = 6;
const format = 'p2wpkh';
const regtestBech32AddressHrp = 'bcrt';
const tokens = 1e6;
const txIdHexByteLength = 64;

// Sending to chain addresses should result in on-chain sent funds
test(`Send to chain address`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.target;

  const address1 = (await createChainAddress({format, lnd})).address;
  const address2 = (await createChainAddress({format, lnd})).address;

  const startBalance = await getChainBalance({lnd});

  const sent = await sendToChainAddresses({
    lnd: cluster.control.lnd,
    send_to: [
      {address: address1, tokens: tokens / 2},
      {address: address2, tokens: tokens / 2},
    ],
  });

  await delay(3000);

  equal(sent.id.length, txIdHexByteLength, 'Transaction id is returned');
  equal(sent.is_confirmed, false, 'Transaction is not yet confirmed');
  equal(sent.is_outgoing, true, 'Transaction is outgoing');
  equal(sent.tokens, tokens, 'Tokens amount matches tokens sent');
  equal(sent.type, 'chain_transaction', 'Send is a chain transaction');

  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(3000);

  const endBalance = await getChainBalance({lnd});

  const adjustment = endBalance.chain_balance - startBalance.chain_balance;

  equal(adjustment, tokens, 'Transaction balance is shifted');

  await cluster.kill({});

  return end();
});
