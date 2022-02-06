const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {getWalletInfo} = require('./../../');

const initHeight = 1;
const interval = 10;
const pubKeyHexLength = Buffer.alloc(33).toString('hex').length;
const regtestChainId = '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f';
const times = 1000;
const walletInfoType = 'wallet';

// Getting the wallet info should return info about the wallet
test(`Get wallet info`, async ({end, equal, ok, strictSame}) => {
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

    equal(result.active_channels_count, 0, 'Expected channels count');
    equal(!!result.alias, true, 'Expected alias');
    strictSame(result.chains, [regtestChainId], 'Got chains');
    equal(!!result.current_block_hash, true, 'Expected best block hash');
    ok(result.current_block_height >= initHeight, 'Expected block height');
    equal(!!result.latest_block_at, true, 'Last block time');
    equal(result.peers_count, 0, 'Expected wallet peers count');
    equal(result.pending_channels_count, 0, 'Expected pending channels count');
    equal(result.public_key.length, pubKeyHexLength, 'Expected public key');
    strictSame(result.uris.length, 1, 'Expected node URI');
    equal(!!result.version, true, 'Expected version');
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
