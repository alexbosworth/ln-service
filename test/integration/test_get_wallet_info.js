const {test} = require('tap');

const getWalletInfo = require('./../../getWalletInfo');
const {spawnLnd} = require('./../macros');
const {waitForTermination} = require('./../macros');

const initHeight = 1;
const pubKeyHexLength = Buffer.alloc(33).toString('hex').length;
const walletInfoType = 'wallet';

// Getting the wallet info should return info about the wallet
test(`Get wallet info`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const result = await getWalletInfo({lnd});

  equal(result.active_channels_count, 0, 'Expected channels count');
  equal(!!result.alias, true, 'Expected alias');
  equal(!!result.current_block_hash, true, 'Expected best block hash');
  equal(result.current_block_height, initHeight, 'Expected best block height');
  equal(result.is_synced_to_chain, true, 'Expected synced to chain status');
  equal(!!result.latest_block_at, true, 'Last block time');
  equal(result.peers_count, 0, 'Expected wallet peers count');
  equal(result.pending_channels_count, 0, 'Expected pending channels count');
  equal(result.public_key.length, pubKeyHexLength, 'Expected public key');
  equal(result.type, walletInfoType, 'Expected wallet info type');
  equal(!!result.version, true, 'Expected version');

  kill();

  await waitForTermination({lnd});

  return end();
});
