const {test} = require('@alexbosworth/tap');
const tinysecp = require('tiny-secp256k1');

const {broadcastChainTransaction} = require('./../../');
const {chainSendTransaction} = require('./../macros');
const {createChainAddress} = require('./../../');
const {generateBlocks} = require('./../macros');
const {requestChainFeeIncrease} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const count = 100;
const defaultVout = 0;
const fee = 1e3;
const format = 'np2wpkh';
const tokens = 1e8;

// Test requesting an increase in chain fees
test(`Request chain fee increase`, async ({end, equal}) => {
  const node = await spawnLnd({});

  const {lnd} = node;

  // Generate some funds
  const {blocks} = await node.generate({count});

  const [block] = blocks;

  const [coinbaseTransactionId] = block.transaction_ids;

  const {transaction} = chainSendTransaction({
    fee,
    tokens,
    destination: (await createChainAddress({format, lnd})).address,
    ecp: (await import('ecpair')).ECPairFactory(tinysecp),
    private_key: node.mining_key,
    spend_transaction_id: coinbaseTransactionId,
    spend_vout: defaultVout,
  });

  const {id} = await broadcastChainTransaction({transaction, lnd: node.lnd});

  await requestChainFeeIncrease({
    lnd,
    transaction_id: id,
    transaction_vout: Number(),
  });

  node.kill();

  await waitForTermination({lnd});

  return end();
});
