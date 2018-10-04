const {readFileSync} = require('fs');

const {test} = require('tap');

const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {generateBlocks} = require('./../macros');
const getChannels = require('./../../getChannels');
const openChannel = require('./../../openChannel');

const confirmationCount = 6;
const maxChannelCapacity = 16776216;

// Opening a channel should open a channel
test(`Open channel`, async ({end, equal}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  await openChannel({lnd, partner_public_key: cluster.target_node_public_key});

  await generateBlocks({
    cert: readFileSync(cluster.control.chain_rpc_cert),
    count: confirmationCount,
    host: cluster.control.listen_ip,
    pass: cluster.control.chain_rpc_pass,
    port: cluster.control.chain_rpc_port,
    user: cluster.control.chain_rpc_user,
  });

  const {channels} = await getChannels({lnd});

  const [channel] = channels;

  equal(channel.capacity, maxChannelCapacity, 'Channel capacity');
  equal(channel.is_active, true, 'Channel active');
  equal(channel.is_closing, false, 'Channel not closing');
  equal(channel.is_opening, false, 'Channel not opening');
  equal(channel.is_private, false, 'Channel not private');
  equal(channel.partner_public_key, cluster.target_node_public_key, 'Pubkey');
  equal(channel.received, 0, 'Channel received');
  equal(channel.remote_balance, 0, 'Channel remote balance');
  equal(channel.sent, 0, 'Channel sent');
  equal(channel.transaction_vout, 0, 'Channel transactin vout');
  equal(channel.unsettled_balance, 0, 'Channel unsettled balance');

  delay(1000);

  [cluster.control, cluster.target].forEach(({kill}) => kill());

  return end();
});

