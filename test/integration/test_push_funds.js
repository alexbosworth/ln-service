const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {getChannel} = require('./../../');
const {getChannelBalance} = require('./../../');
const {getChannels} = require('./../../');
const {getHeight} = require('./../../');
const {pay} = require('./../../');
const {routeFromChannels} = require('./../../');

const channelCapacityTokens = 1e6;
const {floor} = Math;
const interval = 1000;
const mtokPerTok = 1e3;
const reserveRatio = 0.02;
const size = 2;
const times = 100;
const tokens = 1e3;

// Pushing funds via a fee bump should result in the destination getting funds
test('Push funds', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {lnd} = control;

  await setupChannel({
    lnd,
    generate: control.generate,
    give_tokens: floor(channelCapacityTokens * reserveRatio),
    to: target,
  });

  const destination = control.id;
  const height = (await getHeight({lnd})).current_block_height;
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

  const {route} = routeFromChannels({
    channels,
    destination,
    height,
    mtokens,
    payment: invoice.payment,
    total_mtokens: !!invoice.payment ? mtokens : undefined,
  });

  await pay({lnd, path: {id: invoice.id, routes: [route]}});

  await asyncRetry({interval, times}, async () => {
    const finalBalance = (await getChannelBalance({lnd})).channel_balance;

    if (initialBalance - finalBalance !== tokens) {
      throw new Error('ExpectedBalanceToBeAdjustedAsExpected');
    }

    strictEqual(initialBalance - finalBalance, tokens, 'Funds pushed to peer');
  });

  await kill({});

  return;
});
