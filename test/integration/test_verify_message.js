const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {signMessage} = require('./../../');
const {verifyMessage} = require('./../../');

const message = 'message';

// Sign message should return a signature for the message
test(`Sign message`, async () => {
  const [{id, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const {signature} = await signMessage({lnd, message});

  const verified = await verifyMessage({lnd, message, signature});

  equal(verified.signed_by, id, 'Signature is verified');

  await kill({});

  return;
});
