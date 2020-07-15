const {address} = require('bitcoinjs-lib');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getChainBalance} = require('./../../');
const {sendToChainAddresses} = require('./../../');

const chainAddressRowType = 'chain_address';
const confirmationCount = 6;
const format = 'p2wpkh';
const regtestBech32AddressHrp = 'bcrt';
const tokens = 1e6;
const txIdHexByteLength = 64;

// Sending to chain addresses should result in on-chain sent funds
test(`Send to chain address`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.target;

  const address1 = (await createChainAddress({format, lnd})).address;
  const address2 = (await createChainAddress({format, lnd})).address;

  const startBalance = await getChainBalance({lnd});

  const sent = await sendToChainAddresses({
    lnd: cluster.control.lnd,
    send_to: [
      {address: address1, tokens: tokens / [address1, address2].length},
      {address: address2, tokens: tokens / [address1, address2].length},
    ],
  });

  equal(sent.id.length, txIdHexByteLength, 'Transaction id is returned');
  equal(sent.is_confirmed, false, 'Transaction is not yet confirmed');
  equal(sent.is_outgoing, true, 'Transaction is outgoing');
  equal(sent.tokens, tokens, 'Tokens amount matches tokens sent');

  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});

  await delay(4000);

  const endBalance = await getChainBalance({lnd});

  const adjustment = endBalance.chain_balance - startBalance.chain_balance;

  equal(adjustment, tokens, 'Transaction balance is shifted');

  await cluster.kill({});

  return end();
});
