const asyncRetry = require('async/retry');
const {test} = require('tap');

const {createChainAddress} = require('./../../');
const {createCluster} = require('./../macros');
const {openChannel} = require('./../../');

const channelCapacityTokens = 1e6;
const defaultFee = 1e3;
const defaultVout = 0;
const format = 'p2wpkh';
const giftTokens = 1000;
const interval = 250;
const times = 100;
const txIdHexLength = 32 * 2;

// Opening a channel should open a channel
test(`Open channel`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  const {address} = await createChainAddress({format, lnd});

  const channelOpen = await asyncRetry({interval, times}, async () => {
    return await openChannel({
      lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      cooperative_close_address: address,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: cluster.target.public_key,
      socket: cluster.target.socket,
    });
  });

  equal(channelOpen.transaction_id.length, txIdHexLength, 'Channel tx id');
  equal(channelOpen.transaction_vout, defaultVout, 'Channel tx output index');

  await cluster.kill({});

  return end();
});
