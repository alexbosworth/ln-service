const {deepEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncEach = require('async/each');
const asyncRetry = require('async/retry');
const asyncTimeout = require('async/timeout');
const {extractTransaction} = require('psbt');
const {spawnLightningCluster} = require('ln-docker-daemons');
const tinysecp = require('tiny-secp256k1');

const {addPeer} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {cancelPendingChannel} = require('./../../');
const {deletePendingChannel} = require('./../../');
const {fundPendingChannels} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChannels} = require('./../../');
const {getLockedUtxos} = require('./../../');
const {getMasterPublicKeys} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {openChannels} = require('./../../');
const {signPsbt} = require('./../../');
const {unlockUtxo} = require('./../../');

const capacity = 1e6;
const count = 100;
const delay = n => new Promise(resolve => setTimeout(resolve, n));
const description = 'description';
const interval = 100;
const race = promises => Promise.race(promises);
const size = 3;
const timeout = 1000 * 20;
const times = 2000;

// Forfeiting a pending channel should remove the pending channel
test(`Forfeit pending channel`, async t => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);

  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await asyncRetry({interval, times}, async () => {
    const wallet = await getWalletInfo({lnd});

    await generate({});

    if (!wallet.is_synced_to_chain) {
      throw new Error('NotSyncedToChain');
    }
  });

  await generate({count});

  await asyncEach([target, remote], async node => {
    return await addPeer({lnd, public_key: node.id, socket: node.socket});
  });

  const channels = [{
    capacity,
    description,
    is_private: true,
    partner_public_key: target.id,
  }];

  // Propose a channel to target
  const proposeToTarget = await asyncRetry({interval: 1000, times}, cbk => {
    return asyncTimeout(openChannels, 1000 * 3)({
      channels,
      lnd,
      is_avoiding_broadcast: true,
    },
    async (err, res) => {
      await generate({});

      await asyncEach([target, remote], async node => {
        return await addPeer({lnd, public_key: node.id, socket: node.socket});
      });

      return cbk(err, res)
    });
  });

  // Setup funding for the target
  const fundTarget = await fundPsbt({lnd, outputs: proposeToTarget.pending});

  // Sign the funding to the target
  const signTarget = await signPsbt({lnd, psbt: fundTarget.psbt});

  // Fund the target channel that will get stuck
  await fundPendingChannels({
    lnd,
    channels: proposeToTarget.pending.map(n => n.id),
    funding: signTarget.psbt,
  });

  await asyncEach((await getLockedUtxos({lnd})).utxos, async utxo => {
    return await unlockUtxo({
      lnd,
      id: utxo.lock_id,
      transaction_id: utxo.transaction_id,
      transaction_vout: utxo.transaction_vout,
    });
  });

  // Propose a channel to remote
  const proposeToRemote = await asyncRetry({interval: 1000, times}, cbk => {
    return asyncTimeout(openChannels, 1000 * 3)({
      lnd,
      channels: [{
        capacity,
        description,
        is_private: true,
        partner_public_key: remote.id,
      }],
      is_avoiding_broadcast: true,
    },
    cbk);
  });

  // Setup funding for the remote, using the same inputs
  const fundRemote = await fundPsbt({
    lnd,
    inputs: fundTarget.inputs,
    outputs: proposeToRemote.pending
  });

  // Sign the funding to the target
  const signRemote = await signPsbt({lnd, psbt: fundRemote.psbt});

  // Fund the remote channel
  await fundPendingChannels({
    lnd,
    channels: proposeToRemote.pending.map(n => n.id),
    funding: signRemote.psbt,
  });

  await delay(2000);

  const {transaction} = extractTransaction({ecp, psbt: signRemote.psbt});

  await broadcastChainTransaction({lnd, transaction});

  await generate({});

  const channel = await asyncRetry({interval: 1000, times}, async () => {
    const [channel] = (await getChannels({lnd})).channels;

    // Exit early when the channel is created
    if (!!channel) {
      return channel;
    }

    await broadcastChainTransaction({lnd, transaction});

    await generate({});

    throw new Error('ExpectedNewChannelCreated');
  });

  const [pending] = (await getPendingChannels({lnd})).pending_channels;

  // Description is not supported in LND 0.16.4 or before
  if (!!pending.description) {
    deepEqual(pending.description, description, 'Got expected description');
    deepEqual(pending.is_private, true, 'Got pending private status');
  }

  const stuckTx = extractTransaction({ecp, psbt: signTarget.psbt});

  const [stuckPending] = proposeToTarget.pending;

  // Try to cancel the pending channel, it will fail
  try {
    await cancelPendingChannel({lnd, id: stuckPending.id});
  } catch (err) {
    const [code] = err;

    deepEqual(code, 503, 'Pending channel cannot be canceled');
  }

  try {
    await deletePendingChannel({
      lnd,
      confirmed_transaction: transaction,
      pending_transaction: stuckTx.transaction,
      pending_transaction_vout: pending.transaction_vout,
    });

    const [notPending] = (await getPendingChannels({lnd})).pending_channels;

    deepEqual(notPending, undefined, 'Conflicting pending deleted');
  } catch (err) {
    deepEqual(err, [501, 'DeletePendingChannelMethodNotSupported']);
  }

  await kill({});

  return;
});
