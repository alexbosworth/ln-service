const {address} = require('bitcoinjs-lib');
const {test} = require('tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getWalletInfo} = require('./../../');
const {sendToChainAddress} = require('./../../');

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

  const {address} = await createChainAddress({format, lnd});

  const startBalance = await getChainBalance({lnd});

  const sent = await sendToChainAddress({
    address,
    tokens,
    lnd: cluster.control.lnd,
  });

  equal(sent.id.length, txIdHexByteLength, 'Transaction id is returned');
  equal(sent.is_confirmed, false, 'Transaction is not yet confirmed');
  equal(sent.is_outgoing, true, 'Transaction is outgoing');
  equal(sent.tokens, tokens, 'Tokens amount matches tokens sent');

  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount, node: cluster.control});

  const endBalance = await getChainBalance({lnd});

  const adjustment = endBalance.chain_balance - startBalance.chain_balance;

  equal(adjustment, tokens, 'Transaction balance is shifted');

  try {
    await sendToChainAddress({
      address,
      is_send_all: true,
      lnd: cluster.control.lnd,
    });

    const controlFunds = await getChainBalance({lnd: cluster.control.lnd});

    equal(controlFunds.chain_balance, 0, 'All funds sent on-chain');
  } catch (err) {
    if (err[2].message !== '2 UNKNOWN: transaction output is dust') {
      throw err;
    }
  }

  await cluster.kill({});

  return end();
});
