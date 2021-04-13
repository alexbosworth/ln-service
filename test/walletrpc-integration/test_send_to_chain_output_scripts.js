const {script} = require('bitcoinjs-lib');
const {test} = require('tap');
const {Transaction} = require('bitcoinjs-lib');

const {createCluster} = require('./../macros');
const {getChainTransactions} = require('./../../');
const {sendToChainOutputScripts} = require('./../../');

const asBuf = hex => Buffer.from(hex, 'hex');
const asHex = buffer => buffer.toString('hex');
const {compile} = script;
const confirmationCount = 6;
const {fromHex} = Transaction;
const OP_RETURN = 0x6a;
const tokens = 1e6;

// Sending to chain output scripts should result in on-chain sent funds
test(`Send to chain output scripts`, async ({end, equal, strictSame}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const script = [].concat(OP_RETURN).concat(asBuf(cluster.target.public_key));

  const sendTo = [{tokens, script: asHex(compile(script))}];

  const sent = await sendToChainOutputScripts({lnd, send_to: sendTo});

  const outs = fromHex(sent.transaction).outs
    .filter(n => n.value === tokens)
    .map(({script, value}) => ({script: asHex(script), tokens: value}));

  // The OP_RETURN is present in the output
  strictSame(outs, sendTo, 'Got expected outputs');

  // Generate to confirm the tx
  await cluster.generate({count: confirmationCount});

  const {transactions} = await getChainTransactions({lnd});

  const tx = transactions.find(n => n.transaction === sent.transaction) || {};

  equal(tx.is_confirmed, true, 'Transaction is confirmed');

  await cluster.kill({});

  return end();
});
