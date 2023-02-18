const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {signChainAddressMessage} = require('./../../');

const message = 'message';

// Signing a chain address message should result in a signature
test(`Sign chain address message`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [control] = nodes;

  const {lnd} = control;

  const {address} = await createChainAddress({lnd});

  try {
    const {signature} = await signChainAddressMessage({address, lnd, message});

    equal(!!signature, true, 'Got a signature for a chain address');
  } catch (err) {
    const [code, message] = err;

    equal(message, 'BackingLndDoesNotSupportSigningChainMessages', 'missing');
  }

  await kill({});

  return end();
});
