const asyncRetry = require('async/retry');
const {decodeChanId} = require('bolt07');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {createInvoice} = require('./../../');
const {getChannel} = require('./../../');
const {getChannelBalance} = require('./../../');
const {getChannels} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getWalletInfo} = require('./../../');
const {pay} = require('./../../');
const {routeFromChannels} = require('./../../');
const {setupChannel} = require('./../macros');

const channelCapacityTokens = 1e6;
const {floor} = Math;
const interval = 1000;
const mtokPerTok = 1e3;
const reserveRatio = 0.02;
const times = 100;
const tokens = 1e3;

// Pushing funds via a fee bump should result in the destination getting funds
test('Push funds', async ({end, equal}) => {
  let cluster;

  try {
    cluster = await createCluster({
      is_circular_enabled: true,
      is_remote_skipped: true,
    });
  } catch (err) {
    cluster = await createCluster({is_remote_skipped: true});
  }

  const {lnd} = cluster.control;

  await setupChannel({
    lnd,
    generate: cluster.generate,
    give: floor(channelCapacityTokens * reserveRatio),
    to: cluster.target,
  });

  const destination = (await getWalletInfo({lnd})).public_key;
  const height = (await getWalletInfo({lnd})).current_block_height;
  const initialBalance = (await getChannelBalance({lnd})).channel_balance;
  const invoice = await createInvoice({lnd});
  const mtokens = '1000';
  const mtokensToGive = BigInt(tokens) * BigInt(mtokPerTok);

  const [{id}] = (await getChannels({lnd})).channels;

  const channel = await getChannel({id, lnd});

  const peerPolicy = channel.policies.find(n => n.public_key !== destination);

  peerPolicy.base_fee_mtokens = mtokensToGive.toString();
  peerPolicy.fee_rate = Number();

  const channels = [channel, channel];

  const {route} = routeFromChannels({channels, destination, height, mtokens});

  await pay({lnd, path: {id: invoice.id, routes: [route]}});

  await asyncRetry({interval, times}, async () => {
    const finalBalance = (await getChannelBalance({lnd})).channel_balance;

    if (initialBalance - finalBalance !== tokens) {
      throw new Error('ExpectedBalanceToBeAdjustedAsExpected');
    }

    equal(initialBalance - finalBalance, tokens, 'Funds pushed to peer');
  });

  await cluster.kill({});

  return end();
});
