const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getBackups} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannel} = require('./../../');
const {recoverFundsFromChannels} = require('./../../');
const {spawnLnd} = require('./../macros');
const {stopDaemon} = require('./../../');
const {waitForPendingChannel} = require('./../macros');
const {waitForTermination} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giftTokens = 1e5;
const seed = 'abandon tank dose ripple foil subway close flock laptop cabbage primary silent plastic unhappy west weird panda plastic brave prefer diesel glad jazz isolate';

// Using the channels backup should recover funds
test(`Recover funds with backup`, async ({end, equal}) => {
  const clone = await spawnLnd({seed});

  const cluster = await createCluster({
    is_remote_skipped: true,
    nodes: [clone],
  });

  const {lnd} = cluster.control;

  const channelOpen = await openChannel({
    lnd: cluster.target.lnd,
    chain_fee_tokens_per_vbyte: defaultFee,
    give_tokens: giftTokens,
    local_tokens: channelCapacityTokens,
    partner_public_key: (await getWalletInfo({lnd})).public_key,
    socket: `${cluster.control.listen_ip}:${cluster.control.listen_port}`,
  });

  await waitForPendingChannel({
    id: channelOpen.transaction_id,
    lnd: cluster.target.lnd,
  });

  const {backup} = await getBackups({lnd});

  await stopDaemon({lnd});

  await recoverFundsFromChannels({backup, lnd: clone.lnd});

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: clone});

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: cluster.target});

  const [chan] = (await getPendingChannels({lnd: clone.lnd})).pending_channels;

  equal(!!chan.close_transaction_id, true, 'Close transaction id found');
  equal(chan.is_active, false, 'Chan no longer active');
  equal(chan.is_closing, true, 'Channel is closing');
  equal(chan.is_opening, false, 'Channel closing');
  equal(chan.local_balance, giftTokens, 'Funds are being restored');
  equal(chan.partner_public_key, cluster.target_node_public_key, 'Peer key');
  equal(chan.transaction_id, channelOpen.transaction_id, 'Chan tx id');
  equal(chan.transaction_vout, channelOpen.transaction_vout, 'Chan tx vout');

  clone.kill();

  await waitForTermination({lnd: clone.lnd});

  await cluster.kill({});

  return end();
});
