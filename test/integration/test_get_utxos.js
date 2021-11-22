const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {getUtxos} = require('./../../');

const format = 'p2wpkh';
const times = 300;
const tokens = 1e8;

// Getting utxos should list out the utxos
test(`Get utxos`, async ({end, equal, fail, strictSame}) => {
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

  equal(!!utxos.length, true, 'Unspent output returned');

  const [utxo] = utxos;

  equal(!!utxo.address, true, 'UTXO address returned');
  equal(utxo.address_format, format, 'UTXO address format returned');
  equal(utxo.confirmation_count, 100, 'Confirmation count returned');
  equal(!!utxo.output_script, true, 'Output script returned');
  equal(!!utxo.tokens, true, 'UTXO amount returned');
  equal(!!utxo.transaction_id, true, 'UTXO transaction id returned');
  equal(utxo.transaction_vout !== undefined, true, 'UTXO vout returned');

  await kill({});

  return end();
});
