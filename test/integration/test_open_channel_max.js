const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {componentsOfTransaction} = require('@alexbosworth/blockchain');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getChannels} = require('./../../');
const {getUtxos} = require('./../../');
const {openChannel} = require('./../../');

const count = 101;
const description = 'description';
const interval = 250;
const size = 2;
const times = 1000;

// Opening a channel with max funds should open a channel using all funds
test(`Open channel max`, async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, id, lnd}, target] = nodes;

  await generate({count});

  // Find the second UTXO, it would not normally be chosen by coin selection
  const utxo = await asyncRetry({interval, times}, async () => {
    const {utxos} = await getUtxos({lnd});

    const [, outpoint] = utxos;

    if (!outpoint) {
      throw new Error('ExpectedMultipleUtxos');
    }

    return {
      transaction_id: outpoint.transaction_id,
      transaction_vout: outpoint.transaction_vout,
    };
  });

  // Open the channel using coin selection
  const channelOpen = await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: target.id, socket: target.socket});

    return await openChannel({
      description,
      lnd,
      inputs: [utxo],
      is_max_funding: true,
      partner_public_key: target.id,
      socket: target.socket,
    });
  });

  const {transactions} = await getChainTransactions({lnd});

  const tx = transactions.find(n => n.id === channelOpen.transaction_id);

  const components = componentsOfTransaction({transaction: tx.transaction});

  const [input] = components.inputs;

  // Wait for the channel to activate
  await asyncRetry({interval, times}, async () => {
    await generate({});

    const {channels} = await getChannels({lnd});

    const [channel] = channels;

    if (!channel) {
      throw new Error('ExpectedMaxChannelOpened');
    }

    // LND 0.16.4 and below do not support max funding for channel opens
    if (channel.description !== description) {
      return;
    }

    // Make sure the channel spent the correct transaction output
    equal(input.id, utxo.transaction_id, 'Channel open spent down right UTXO');

    return;
  });

  await kill({});

  return;
});
