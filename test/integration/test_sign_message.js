const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {signMessage} = require('./../../');

const expectedSignatureLength = 104;
const message = 'message';

// Sign message should return a signature for the message
test(`Sign message`, async ({end, equal}) => {
  const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

  const {signature} = await signMessage({lnd, message});

  equal(signature.length, expectedSignatureLength, 'Signature is returned');

  await kill({});

  return end();
});
