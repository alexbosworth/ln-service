const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {signChainAddressMessage} = require('./../../');
const {verifyChainAddressMessage} = require('./../../');

const message = 'message';

// Verifying a chain address message signature should result in verification
test(`Verify chain address message`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [control] = nodes;

  const {lnd} = control;

  const {address} = await createChainAddress({lnd});

  try {
    const {signature} = await signChainAddressMessage({address, lnd, message});

    const verify = await verifyChainAddressMessage({
      address,
      lnd,
      message,
      signature,
    });

    equal(verify.signed_by.length, 66, 'Got public key');
  } catch (err) {
    const [code, message] = err;

    equal(message, 'BackingLndDoesNotSupportSigningChainMessages', 'missing');

    await kill({});

    return;
  }

  try {
    const verify = await verifyChainAddressMessage({
      address,
      lnd,
      message,
      signature: '1f54fe4a1332633d3c625cf8de41004f3ce3978f7e6e9845dea944e46fab878ec5676e08d44b505ede70fa2e693192405e16baf3e18de44987db6d9e82d4f14907',
    });
  } catch (err) {
    const [code, message] = err;

    equal(code, 400, 'Invalid signature code');
    equal(message, 'InvalidSignatureReceivedForChainAddress', 'invalid sig');
  }

  await kill({});

  return;
});
