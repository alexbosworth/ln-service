const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {sendToChainAddress} = require('./../../');

const chainAddressRowType = 'chain_address';
const confirmationCount = 6;
const description = 'description';
const format = 'p2wpkh';
const interval = retryCount => 10 * Math.pow(2, retryCount);
const regtestBech32AddressHrp = 'bcrt';
const times = 20;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Sending to chain addresses should result in on-chain sent funds
test(`Send to chain address`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.target;

  const {address} = await createChainAddress({format, lnd});

  const startBalance = await getChainBalance({lnd});

  const sent = await sendToChainAddress({
    address,
    description,
    tokens,
    lnd: cluster.control.lnd,
  });

  equal(sent.id.length, txIdHexByteLength, 'Transaction id is returned');
  equal(sent.is_confirmed, false, 'Transaction is not yet confirmed');
  equal(sent.is_outgoing, true, 'Transaction is outgoing');
  equal(sent.tokens, tokens, 'Tokens amount matches tokens sent');

  // Wait for generation to be over
  await asyncRetry({interval, times}, async () => {
    // Generate to confirm the tx
    await cluster.generate({});

    const endBalance = await getChainBalance({lnd});

    const adjustment = endBalance.chain_balance - startBalance.chain_balance;

    if (adjustment !== tokens) {
      throw new Error('BalanceNotYetShifted');
    }

    return;
  });

  const endBalance = await getChainBalance({lnd});

  const adjustment = endBalance.chain_balance - startBalance.chain_balance;

  equal(adjustment, tokens, 'Transaction balance is shifted');

  try {
    await asyncRetry({interval, times}, async () => {
      await sendToChainAddress({
        address,
        is_send_all: true,
        lnd: cluster.control.lnd,
      });

      return;
    });

    const controlFunds = await getChainBalance({lnd: cluster.control.lnd});

    equal(controlFunds.chain_balance, 0, 'All funds sent on-chain');
  } catch (err) {
    if (err[2].message !== '2 UNKNOWN: transaction output is dust') {
      throw err;
    }
  }

  const {transactions} = await getChainTransactions({
    lnd: cluster.control.lnd,
  });

  const sentTransaction = transactions.find(n => n.id === sent.id);

  equal(sentTransaction.description, description, 'Got expected label');

  await cluster.kill({});

  return end();
});
