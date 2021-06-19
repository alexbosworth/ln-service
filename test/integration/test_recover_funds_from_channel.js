const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {getBackup} = require('./../../');
const {getPendingChannels} = require('./../../');
const {recoverFundsFromChannel} = require('./../../');
const {setupChannel} = require('./../macros');
const {spawnLnd} = require('./../macros');
const {stopDaemon} = require('./../../');
const {waitForPendingChannel} = require('./../macros');
const {waitForTermination} = require('./../macros');

const channelCapacityTokens = 1e6;
const confirmationCount = 20;
const defaultFee = 1e3;
const giftTokens = 1e5;
const seed = 'abandon tank dose ripple foil subway close flock laptop cabbage primary silent plastic unhappy west weird panda plastic brave prefer diesel glad jazz isolate';

// Using a channel backup should recover funds
test(`Recover funds from channel`, async ({end, equal}) => {
  const clone = await spawnLnd({seed});

  const cluster = await createCluster({
    is_remote_skipped: true,
    nodes: [clone],
  });

  const {lnd} = cluster.control;

  const channelOpen = await setupChannel({
    generate: cluster.generate,
    generator: cluster.target,
    give: giftTokens,
    lnd: cluster.target.lnd,
    to: cluster.control,
  });

  const {backup} = await getBackup({
    lnd,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  await stopDaemon({lnd});

  cluster.control.kill();

  await recoverFundsFromChannel({backup, lnd: clone.lnd});

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: clone});

  await delay(3000);

  await cluster.generate({count: confirmationCount, node: cluster.target});

  await delay(3000);

  await waitForPendingChannel({
    id: channelOpen.transaction_id,
    is_closing: true,
    lnd: clone.lnd,
  });

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
