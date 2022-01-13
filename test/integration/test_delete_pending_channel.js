const {once} = require('events');

const asyncEach = require('async/each');
const asyncRetry = require('async/retry');
const {extractTransaction} = require('psbt');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {broadcastChainTransaction} = require('./../../');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const {deletePendingChannel} = require('./../../');
const {fundPendingChannels} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChannels} = require('./../../');
const {getLockedUtxos} = require('./../../');
const {getPendingChannels} = require('./../../');
const {openChannels} = require('./../../');
const {signPsbt} = require('./../../');
const {unlockUtxo} = require('./../../');

const capacity = 1e6;
const count = 100;
const interval = 100;
const race = promises => Promise.race(promises);
const size = 3;
const timeout = 1000 * 5;
const times = 200;

// Forfeiting a pending channel should remove the pending channel
test(`Forfeit pending channel`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target, remote] = nodes;

  const {generate, lnd} = control;

  try {
    await control.generate({count});

    await asyncEach([target, remote], async node => {
      return await addPeer({lnd, public_key: node.id, socket: node.socket});
    });

    const channels = [{capacity, partner_public_key: target.id}];

    // Propose a channel to target
    const proposeToTarget = await asyncRetry({interval, times}, async () => {
      return await race([
        delay(timeout),
        openChannels({channels, lnd, is_avoiding_broadcast: true}),
      ]);
    });

    // Setup funding for the target
    const fundTarget = await fundPsbt({lnd, outputs: proposeToTarget.pending});

    // Sign the funding to the target
    const signTarget = await signPsbt({lnd, psbt: fundTarget.psbt});

    // Fund the target channel
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
    const proposeToRemote = await asyncRetry({interval, times}, async () => {
      return await race([
        delay(timeout),
        openChannels({lnd,
          channels: [{capacity, partner_public_key: remote.id}],
          is_avoiding_broadcast: true,
        }),
      ]);
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

    const {transaction} = extractTransaction({psbt: signRemote.psbt});

    await broadcastChainTransaction({lnd, transaction});

    const channel = await asyncRetry({interval, times}, async () => {
      const [channel] = (await getChannels({lnd})).channels;

      if (!!channel) {
        return channel;
      }

      await generate({});

      throw new Error('ExpectedNewChannelCreated');
    });

    const [pending] = (await getPendingChannels({lnd})).pending_channels;

    const stuckTx = extractTransaction({psbt: signTarget.psbt});

    await deletePendingChannel({
      lnd,
      confirmed_transaction: transaction,
      pending_transaction: stuckTx.transaction,
      pending_transaction_vout: pending.transaction_vout,
    });

    const [stillPending] = (await getPendingChannels({lnd})).pending_channels;

    equal(stillPending, undefined, 'Conflicting pending channel deleted');
  } catch (err) {
    equal(err, null, 'No error is expected');
  } finally {
    await kill({});
  }

  return end();
});
