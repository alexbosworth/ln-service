const asyncMap = require('async/map');
const asyncRetry = require('async/retry');
const {extractTransaction} = require('psbt');
const {finalizePsbt} = require('psbt');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');
const tinysecp = require('tiny-secp256k1');
const {transactionAsPsbt} = require('psbt');

const {addPeer} = require('./../../');
const {createChainAddress} = require('./../../');
const {delay} = require('./../macros');
const {fundPendingChannels} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {getPeers} = require('./../../');
const {openChannels} = require('./../../');
const {sendToChainAddresses} = require('./../../');

const capacity = 1e6;
const count = 10;
const interval = 10;
const maturity = 100;
const race = promises => Promise.race(promises);
const size = 3;
const timeout = 250 * 10;
const times = 2000;

// Opening channels should open up channels
test(`Open channels`, async ({end, equal}) => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);

  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  try {
    await generate({count: maturity});

    await asyncRetry({interval, times}, async () => {
      const lnds = [lnd, target.lnd, remote.lnd];

      const heights = await asyncMap(lnds, async lnd => {
        return (await getHeight({lnd})).current_block_height;
      });

      const [controlHeight, targetHeight, remoteHeight] = heights;

      if (controlHeight !== targetHeight || controlHeight !== remoteHeight) {
        throw new Error('ExpectedSyncHeights');
      }
    });

    const chainTx = (await getChainTransactions({lnd})).transactions;

    const spending = chainTx.map(({transaction}) => transaction);

    const {address} = await createChainAddress({lnd});

    const channels = [target, remote].map(({id}) => ({
      capacity,
      cooperative_close_address: address,
      partner_public_key: id,
    }));

    let pending;

    // Wait for peers to be connected
    await asyncRetry({interval, times}, async () => {
      await addPeer({lnd, public_key: remote.id, socket: remote.socket});
      await addPeer({lnd, public_key: target.id, socket: target.socket});

      if ((await getPeers({lnd})).peers.length !== channels.length) {
        throw new Error('ExpectedConnectedPeersToOpenChannels');
      }

      return;
    });

    await asyncRetry({interval, times}, async () => {
      pending = (await openChannels({channels, lnd})).pending;
    });

    // Normally funding would involve an un-broadcast transaction
    const {id} = await sendToChainAddresses({lnd, send_to: pending});

    await asyncRetry({interval, times}, async () => {
      const {transactions} = await getChainTransactions({lnd});

      if (!transactions.find(n => n.id === id)) {
        throw new Error('ExpectedChainTransaction');
      }

      return;
    });

    const fundTx = (await getChainTransactions({lnd})).transactions
      .map(({transaction}) => transaction)
      .find(transaction => spending.find(spend => transaction !== spend));

    const fundingPsbt = transactionAsPsbt({
      ecp,
      spending,
      transaction: fundTx,
    });

    const {psbt} = finalizePsbt({ecp, psbt: fundingPsbt.psbt});

    const reconstitutedTransaction = extractTransaction({ecp, psbt});

    await fundPendingChannels({
      lnd,
      channels: pending.map(({id}) => id),
      funding: psbt,
    });

    await asyncRetry({interval, times}, async () => {
      await generate({});

      const {channels} = await getChannels({lnd});

      if (channels.filter(n => !!n.is_active).length !== pending.length) {
        throw new Error('ExpectedNewChannelsCreatedAndActive');
      }

      const [channel] = channels;

      equal(channel.cooperative_close_address, address, 'Channel close addr');

      return;
    });
  } catch (err) {
    equal(err, null, 'No error is reported');
  } finally {
    return await kill({});
  }

  return end();
});
