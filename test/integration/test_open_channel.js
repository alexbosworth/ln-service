const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {openChannel} = require('./../../');

const channelCapacityTokens = 1e6;
const count = 100;
const defaultFee = 1e3;
const defaultVout = 0;
const giftTokens = 1000;
const interval = 250;
const size = 2;
const times = 1000;
const txIdHexLength = 32 * 2;

// Opening a channel should open a channel
test(`Open channel`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  const {address} = await createChainAddress({lnd});

  await generate({count});

  const channelOpen = await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: target.id, socket: target.socket});

    return await openChannel({
      lnd,
      chain_fee_tokens_per_vbyte: defaultFee,
      cooperative_close_address: address,
      give_tokens: giftTokens,
      local_tokens: channelCapacityTokens,
      partner_public_key: target.id,
      socket: target.socket,
    });
  });

  equal(channelOpen.transaction_id.length, txIdHexLength, 'Channel tx id');
  equal(channelOpen.transaction_vout, defaultVout, 'Channel tx output index');

  await kill({});

  return end();
});
