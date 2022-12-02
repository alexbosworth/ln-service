const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

// No macaroon should allow for accessing a node without a macaroon
test(`Spawn an LND without a macaroon`, async ({end, equal}) => {
  const spawned = await spawnLnd({noauth: true});

  const {lnd} = spawned;

  await getWalletInfo({lnd});

  spawned.kill({});

  await waitForTermination({lnd});

  return end();
});
