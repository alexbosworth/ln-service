const asyncRetry = require('async/retry');
const {script} = require('bitcoinjs-lib');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');
const {Transaction} = require('bitcoinjs-lib');

const {getChainTransactions} = require('./../../');
const {sendToChainOutputScripts} = require('./../../');

const asBuf = hex => Buffer.from(hex, 'hex');
const asHex = buffer => buffer.toString('hex');
const {compile} = script;
const confirmationCount = 6;
const count = 100;
const {fromHex} = Transaction;
const interval = 10;
const OP_RETURN = 0x6a;
const size = 2;
const times = 1000;
const tokens = 1e6;

// Sending to chain output scripts should result in on-chain sent funds
test(`Send to chain output scripts`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  await generate({count});

  const script = [].concat(OP_RETURN).concat(asBuf(target.id));

  const sendTo = [{tokens, script: asHex(compile(script))}];

  const sent = await sendToChainOutputScripts({lnd, send_to: sendTo});

  const outs = fromHex(sent.transaction).outs
    .filter(n => n.value === tokens)
    .map(({script, value}) => ({script: asHex(script), tokens: value}));

  // The OP_RETURN is present in the output
  strictSame(outs, sendTo, 'Got expected outputs');

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

  return end();
});
