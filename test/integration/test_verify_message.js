const {test} = require('tap');

const {signMessage} = require('./../../');
const {spawnLnd} = require('./../macros');
const {verifyMessage} = require('./../../');
const {waitForTermination} = require('./../macros');

const message = 'message';

// Sign message should return a signature for the message
test(`Sign message`, async ({end, equal}) => {
  const spawned = await spawnLnd({});

  const {signature} = await signMessage({message, lnd: spawned.lnd});

  const verified = await verifyMessage({message, signature, lnd: spawned.lnd});

  equal(verified.signed_by, spawned.public_key, 'Signature is verified');

  spawned.kill();

  await waitForTermination({lnd: spawned.lnd});

  return end();
});
