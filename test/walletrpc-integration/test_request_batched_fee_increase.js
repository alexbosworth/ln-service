const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const {fail} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getPendingSweeps} = require('./../../');
const {getUtxos} = require('./../../');
const {requestBatchedFeeIncrease} = require('./../../');
const {signPsbt} = require('./../../');

const count = 100;
const tokens = 1e8;

// Test requesting a batched chain fee increase
test(`Request batched chain fee increase`, async () => {
  const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  try {
    await generate({count});

    const {address} = await createChainAddress({lnd});

    const {psbt} = await fundPsbt({lnd, outputs: [
      {address, tokens},
      {tokens, address: '2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF'},
    ]});

    const {transaction} = await signPsbt({lnd, psbt});

    await broadcastChainTransaction({lnd, transaction});

    const bump = (await getUtxos({lnd})).utxos.find(n => n.tokens === tokens);

    await requestBatchedFeeIncrease({
      lnd,
      transaction_id: bump.transaction_id,
      transaction_vout: bump.transaction_vout,
    });

    const {sweeps} = await getPendingSweeps({lnd});

    const [sweep] = sweeps;

    equal(sweep.transaction_id, bump.transaction_id, 'Requested tx id bump');
    equal(sweep.transaction_vout, bump.transaction_vout, 'Requested tx vout');

    await kill({});
  } catch (err) {
    await kill({});

    equal(err, null, 'Expected no error');
  }

  return;
});
