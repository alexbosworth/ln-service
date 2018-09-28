const {test} = require('tap');

const {delay} = require('./../macros');
const signMessage = require('./../../signMessage');
const {spawnLnd} = require('./../macros');

const expectedSignatureLength = 104;
const message = 'message';
const spawnDelayMs = 1e3;

// Sign message should return a signature for the message
test(`Sign message`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  await delay(spawnDelayMs);

  const {signature} = await signMessage({lnd, message});

  equal(signature.length, expectedSignatureLength, 'Signature is returned');

  kill();

  return end();
});

