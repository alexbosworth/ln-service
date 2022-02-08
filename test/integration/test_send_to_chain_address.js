const asyncRetry = require('async/retry');
const {address} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
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
const interval = 50;
const regtestBech32AddressHrp = 'bcrt';
const size = 2;
const times = 2000;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Sending to chain addresses should result in on-chain sent funds
test(`Send to chain address`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  try {
    const [control, target] = nodes;

    const {generate, lnd} = target;

    const {address} = await createChainAddress({format, lnd});

    await control.generate({count: 100});

    const startBalance = await getChainBalance({lnd});

    // Send funds from control to target
    const sent = await sendToChainAddress({
      address,
      description,
      tokens,
      lnd: control.lnd,
    });

    equal(sent.id.length, txIdHexByteLength, 'Transaction id is returned');
    equal(sent.is_confirmed, false, 'Transaction is not yet confirmed');
    equal(sent.is_outgoing, true, 'Transaction is outgoing');
    equal(sent.tokens, tokens, 'Tokens amount matches tokens sent');

    // Wait for generation to be over
    await asyncRetry({interval, times}, async () => {
      // Generate to confirm the tx
      await control.generate({});

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
          lnd: control.lnd,
        });

        if (!!(await getChainBalance({lnd: control.lnd})).chain_balance) {
          throw new Error('ExpectedChainBalanceOnControlEmptiedOut');
        }

        return;
      });

      const controlFunds = await getChainBalance({lnd: control.lnd});

      equal(controlFunds.chain_balance, 0, 'All funds sent on-chain');
    } catch (err) {
      if (err[2].message !== '2 UNKNOWN: transaction output is dust') {
        throw err;
      }
    }

    const {transactions} = await getChainTransactions({lnd: control.lnd});

    const sentTransaction = transactions.find(n => n.id === sent.id);

    equal(sentTransaction.description, description, 'Got expected label');
  } catch (err) {
    equal(err, null, 'ExpectedNoErrorSendingToChainAddress');
  }

  await kill({});

  return end();
});
