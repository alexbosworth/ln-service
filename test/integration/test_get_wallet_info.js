const {deepStrictEqual} = require('node:assert').strict;
const {ok} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {getWalletInfo} = require('./../../');

const initHeight = 1;
const interval = 10;
const pubKeyHexLength = Buffer.alloc(33).toString('hex').length;
const regtestChainId = '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f';
const times = 1000;
const walletInfoType = 'wallet';

// Getting the wallet info should return info about the wallet
test(`Get wallet info`, async () => {
  const {kill, nodes} = await spawnLightningCluster({});

  const [{generate, lnd}] = nodes;

  try {
    const result = await asyncRetry({interval, times}, async () => {
      await generate({});

      const result = await getWalletInfo({lnd});

      if (result.current_block_height >= initHeight) {
        return result;
      }

      throw new Error('ExpectedBlockHeightAtInitHeight');
    });

    strictEqual(result.active_channels_count, 0, 'Expected channels count');
    strictEqual(!!result.alias, true, 'Expected alias');
    deepStrictEqual(result.chains, [regtestChainId], 'Got chains');
    strictEqual(!!result.current_block_hash, true, 'Expected best block hash');
    ok(result.current_block_height >= initHeight, 'Expected block height');
    strictEqual(!!result.latest_block_at, true, 'Last block time');
    strictEqual(result.peers_count, 0, 'Expected wallet peers count');
    strictEqual(result.pending_channels_count, 0, 'Expected pending channels');
    strictEqual(result.public_key.length, pubKeyHexLength, 'Expected key');
    deepStrictEqual(result.uris.length, 1, 'Expected node URI');
    strictEqual(!!result.version, true, 'Expected version');
  } catch (err) {
    strictEqual(err, null, 'Expected no error');
  }

  await kill({});

  return;
});
