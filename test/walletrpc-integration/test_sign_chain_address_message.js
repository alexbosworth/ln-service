const {equal} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {signChainAddressMessage} = require('./../../');

const message = 'message';

// Signing a chain address message should result in a signature
test(`Sign chain address message`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const {address} = await createChainAddress({lnd});

  try {
    const {signature} = await signChainAddressMessage({address, lnd, message});

    equal(!!signature, true, 'Got a signature for a chain address');
  } catch (err) {
    const [code, message] = err;

    equal(message, 'BackingLndDoesNotSupportSigningChainMessages', 'missing');
  }

  await kill({});

  return;
});
