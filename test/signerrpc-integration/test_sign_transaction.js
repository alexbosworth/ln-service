const {test} = require('@alexbosworth/tap');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {Transaction} = require('bitcoinjs-lib');

const {signTransaction} = require('./../../');

// Signing a transaction should result in signatures for the transaction
test(`Sign transaction`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const {signatures} = await signTransaction({
    lnd,
    inputs: [{
      key_family: 6,
      key_index: 1,
      output_script: '00147ab105a90ccd7e49d96672abcac2995bdb852baa',
      output_tokens: 1e8,
      sighash: Transaction.SIGHASH_ALL,
      vin: 0,
      witness_script: '00',
    }],
    transaction: '0200000001268171371edff285e937adeea4b37b78000c0566cbb3ad64641713ca42171bf6000000006a473044022070b2245123e6bf474d60c5b50c043d4c691a5d2435f09a34a7662a9dc251790a022001329ca9dacf280bdf30740ec0390422422c81cb45839457aeb76fc12edd95b3012102657d118d3357b8e0f4c2cd46db7b39f6d9c38d9a70abcb9b2de5dc8dbfe4ce31feffffff02d3dff505000000001976a914d0c59903c5bac2868760e90fd521a4665aa7652088ac00e1f5050000000017a9143545e6e33b832c47050f24d3eeb93c9c03948bc787b32e1300',
  });

  equal(signatures.length, 1, 'Signature is returned');

  await kill({});

  return end();
});
