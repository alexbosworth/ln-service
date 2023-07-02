const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {getUtxos} = require('./../../');

const format = 'p2wpkh';
const times = 300;
const tokens = 1e8;

// Getting utxos should list out the utxos
test(`Get utxos`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  // Generate some funds for LND
  await asyncRetry({times}, async () => {
    await generate({});

    const wallet = await getChainBalance({lnd});

    if (!wallet.chain_balance) {
      throw new Error('ExpectedChainBalanceForNode');
    }
  });

  const {utxos} = await getUtxos({lnd});

  strictEqual(!!utxos.length, true, 'Unspent output returned');

  const [utxo] = utxos;

  strictEqual(!!utxo.address, true, 'UTXO address returned');
  strictEqual(utxo.address_format, format, 'UTXO address format returned');
  strictEqual(utxo.confirmation_count, 100, 'Confirmation count returned');
  strictEqual(!!utxo.output_script, true, 'Output script returned');
  strictEqual(!!utxo.tokens, true, 'UTXO amount returned');
  strictEqual(!!utxo.transaction_id, true, 'UTXO transaction id returned');
  strictEqual(utxo.transaction_vout !== undefined, true, 'UTXO vout returned');

  await kill({});

  return;
});
