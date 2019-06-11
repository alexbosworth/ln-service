const {test} = require('tap');

const {signMessage} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const expectedSignatureLength = 104;
const message = 'message';

// Sign message should return a signature for the message
test(`Sign message`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const {signature} = await signMessage({lnd, message});

  equal(signature.length, expectedSignatureLength, 'Signature is returned');

  kill();

  await waitForTermination({lnd});

  return end();
});
