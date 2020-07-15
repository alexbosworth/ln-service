const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const initHeight = 1;
const pubKeyHexLength = Buffer.alloc(33).toString('hex').length;
const regtestChainId = '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f';
const walletInfoType = 'wallet';

// Getting the wallet info should return info about the wallet
test(`Get wallet info`, async ({deepEqual, end, equal}) => {
  const spawned = await spawnLnd({});

  const {lnd} = spawned;
  const pubKey = spawned.public_key;

  const result = await getWalletInfo({lnd});

  const expectedUri = `${pubKey}@${spawned.listen_ip}:${spawned.listen_port}`;

  equal(result.active_channels_count, 0, 'Expected channels count');
  equal(!!result.alias, true, 'Expected alias');
  deepEqual(result.chains, [regtestChainId], 'Got chains');
  equal(!!result.current_block_hash, true, 'Expected best block hash');
  equal(result.current_block_height, initHeight, 'Expected best block height');
  equal(result.is_synced_to_chain, true, 'Expected synced to chain status');
  equal(!!result.latest_block_at, true, 'Last block time');
  equal(result.peers_count, 0, 'Expected wallet peers count');
  equal(result.pending_channels_count, 0, 'Expected pending channels count');
  equal(result.public_key.length, pubKeyHexLength, 'Expected public key');
  deepEqual(result.uris, [expectedUri], 'Expected node URI');
  equal(!!result.version, true, 'Expected version');

  spawned.kill();

  await waitForTermination({lnd});

  return end();
});
