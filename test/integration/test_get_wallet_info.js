const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');

const initHeight = 1;
const pubKeyHexLength = Buffer.alloc(33).toString('hex').length;
const regtestChainId = '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f';
const walletInfoType = 'wallet';

// Getting the wallet info should return info about the wallet
test(`Get wallet info`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{lnd}] = nodes;

  const result = await getWalletInfo({lnd});

  equal(result.active_channels_count, 0, 'Expected channels count');
  equal(!!result.alias, true, 'Expected alias');
  strictSame(result.chains, [regtestChainId], 'Got chains');
  equal(!!result.current_block_hash, true, 'Expected best block hash');
  equal(result.current_block_height, initHeight, 'Expected best block height');
  equal(!!result.latest_block_at, true, 'Last block time');
  equal(result.peers_count, 0, 'Expected wallet peers count');
  equal(result.pending_channels_count, 0, 'Expected pending channels count');
  equal(result.public_key.length, pubKeyHexLength, 'Expected public key');
  strictSame(result.uris.length, 1, 'Expected node URI');
  equal(!!result.version, true, 'Expected version');

  await kill({});

  return end();
});
