const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {signMessage} = require('./../../');

const expectedSignatureLength = 104;
const message = 'message';

// Sign message should return a signature for the message
test(`Sign message`, async () => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const {signature} = await signMessage({lnd, message});

  strictEqual(signature.length, expectedSignatureLength, 'Signature returned');

  await kill({});

  return;
});
