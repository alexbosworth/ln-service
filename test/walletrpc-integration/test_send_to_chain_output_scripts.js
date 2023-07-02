const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {scriptElementsAsScript} = require('@alexbosworth/blockchain');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getChainTransactions} = require('./../../');
const {sendToChainOutputScripts} = require('./../../');

const asBuf = hex => Buffer.from(hex, 'hex');
const asHex = buffer => buffer.toString('hex');
const confirmationCount = 6;
const count = 100;
const interval = 10;
const OP_RETURN = 0x6a;
const size = 2;
const times = 1000;
const tokens = 1e6;

// Sending to chain output scripts should result in on-chain sent funds
test(`Send to chain output scripts`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await generate({count});

  const elements = [].concat(OP_RETURN).concat(asBuf(target.id));

  const {script} = scriptElementsAsScript({elements});

  const sendTo = [{script, tokens}];

  const sent = await sendToChainOutputScripts({lnd, send_to: sendTo});

  const outs = componentsOfTransaction({transaction: sent.transaction}).outputs
    .filter(n => n.tokens === tokens);

  // The OP_RETURN is present in the output
  deepEqual(outs, sendTo, 'Got expected outputs');

  // Generate to confirm the tx
  await generate({count: confirmationCount});

  await asyncRetry({interval, times}, async () => {
    const {transactions} = await getChainTransactions({lnd});

    const tx = transactions.find(n => n.transaction === sent.transaction);

    if (!!tx.is_confirmed) {
      return;
    }

    throw new Error('WaitingForTransactionConfirmationPickup');
  });

  const {transactions} = await getChainTransactions({lnd});

  const tx = transactions.find(n => n.transaction === sent.transaction) || {};

  equal(tx.is_confirmed, true, 'Transaction is confirmed');

  await kill({});

  return;
});
