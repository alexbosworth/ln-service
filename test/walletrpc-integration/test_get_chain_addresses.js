const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {getChainAddresses} = require('./../../');

const count = 100;
const expiry = () => new Date(Date.now() + (1000 * 60 * 5)).toISOString();

// Getting chain addresses should return a list of addresses
test(`Get chain addresses`, async () => {
  const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

  try {
    await getChainAddresses({lnd});
  } catch (err) {
    // LND 0.12.1 does not support getting locked UTXOs
    deepEqual(
      err,
      [501, 'BackingLndDoesNotSupportGettingChainAddresses'],
      'Got unsupported error'
    );

    await kill({});

    return;
  }

  try {
    const expected = [
      {
        address: (await createChainAddress({lnd, format: 'np2wpkh'})).address,
        is_change: false,
        tokens: 0,
      },
      {
        address: (await createChainAddress({lnd})).address,
        is_change: false,
        tokens: 0,
      },
      {
        address: (await createChainAddress({lnd, format: 'p2tr'})).address,
        is_change: false,
        tokens: 0,
      },
    ];

    const {addresses} = await getChainAddresses({lnd});

    deepEqual(addresses, expected, 'Got created chain addresses');
  } catch (err) {
    deepEqual(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
