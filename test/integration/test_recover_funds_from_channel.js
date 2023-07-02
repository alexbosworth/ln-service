const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {getPortPromise: getPort} = require('portfinder');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningDocker} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {authenticatedLndGrpc} = require('./../../');
const {createChainAddress} = require('./../../');
const {getBackup} = require('./../../');
const {getIdentity} = require('./../../');
const {getPendingChannels} = require('./../../');
const {getUtxos} = require('./../../');
const {recoverFundsFromChannel} = require('./../../');

const confirmationCount = 20;
const generateAddress = '2N8hwP1WmJrFF5QWABn38y63uYLhnJYJYTF';
const giftTokens = 1e5;
const interval = 10;
const makeAddress = ({lnd}) => createChainAddress({lnd});
const maturity = 100;
const seed = 'about rabbit ozone hope jaguar quit scare twenty punch crisp consider clutch ring frost universe okay execute shrug drink notice abandon wine denial retreat';
const times = 3000;

// Using a channel backup should recover funds
test(`Recover funds from channel`, async () => {
  const control = await asyncRetry({interval, times}, async () => {
    return await spawnLightningDocker({
      seed,
      chain_p2p_port: await getPort({port: 8000, stopPort: 9000}),
      chain_rpc_port: await getPort({port: 9001, stopPort: 10000}),
      chain_zmq_block_port: await getPort({port: 10001, stopPort: 11000}),
      chain_zmq_tx_port: await getPort({port: 11001, stopPort: 12000}),
      generate_address: generateAddress,
      lightning_p2p_port: await getPort({port: 12001, stopPort: 13000}),
      lightning_rpc_port: await getPort({port: 13001, stopPort: 14000}),
      lightning_tower_port: await getPort({port: 14001, stopPort: 15000}),
    });
  });

  const target = await asyncRetry({interval, times}, async () => {
    return await spawnLightningDocker({
      chain_p2p_port: await getPort({port: 8000, stopPort: 9000}),
      chain_rpc_port: await getPort({port: 9001, stopPort: 10000}),
      chain_zmq_block_port: await getPort({port: 10001, stopPort: 11000}),
      chain_zmq_tx_port: await getPort({port: 11001, stopPort: 12000}),
      generate_address: generateAddress,
      lightning_p2p_port: await getPort({port: 12001, stopPort: 13000}),
      lightning_rpc_port: await getPort({port: 13001, stopPort: 14000}),
      lightning_tower_port: await getPort({port: 14001, stopPort: 15000}),
    });
  });

  await control.add_chain_peer({socket: target.chain_socket});
  await target.add_chain_peer({socket: control.chain_socket});

  const controlLnd = authenticatedLndGrpc({
    cert: control.cert,
    macaroon: control.macaroon,
    socket: control.socket,
  });

  const id = (await getIdentity({lnd: controlLnd.lnd})).public_key;

  const targetLnd = authenticatedLndGrpc({
    cert: target.cert,
    macaroon: target.macaroon,
    socket: target.socket,
  });

  const targetId = (await getIdentity({lnd: targetLnd.lnd})).public_key;

  const channelOpen = await setupChannel({
    generate: ({address, count}) => {
      return new Promise(async (resolve, reject) => {
        const {lnd} = targetLnd;

        await target.generate({
          count,
          address: (await makeAddress({lnd})).address,
        });

        if (!count || count < maturity) {
          return resolve();
        }

        await asyncRetry({interval, times}, async () => {
          const [utxo] = (await getUtxos({lnd})).utxos;

          if (!utxo) {
            throw new Error('ExpectedUtxoInUtxos');
          }
        });

        return resolve();
      });
    },
    give_tokens: giftTokens,
    lnd: targetLnd.lnd,
    to: {id, socket: control.ln_socket},
  });

  const {backup} = await getBackup({
    lnd: controlLnd.lnd,
    transaction_id: channelOpen.transaction_id,
    transaction_vout: channelOpen.transaction_vout,
  });

  await control.kill({});

  const clone = await asyncRetry({interval, times}, async () => {
    return await spawnLightningDocker({
      seed,
      chain_p2p_port: await getPort({port: 8000, stopPort: 9000}),
      chain_rpc_port: await getPort({port: 9001, stopPort: 10000}),
      chain_zmq_block_port: await getPort({port: 10001, stopPort: 11000}),
      chain_zmq_tx_port: await getPort({port: 11001, stopPort: 12000}),
      generate_address: generateAddress,
      lightning_p2p_port: await getPort({port: 12001, stopPort: 13000}),
      lightning_rpc_port: await getPort({port: 13001, stopPort: 14000}),
      lightning_tower_port: await getPort({port: 14001, stopPort: 15000}),
    });
  });

  await clone.add_chain_peer({socket: target.chain_socket});

  await target.add_chain_peer({socket: clone.chain_socket});

  const cloneLnd = authenticatedLndGrpc({
    cert: clone.cert,
    macaroon: clone.macaroon,
    socket: clone.socket,
  });

  await addPeer({
    lnd: cloneLnd.lnd,
    public_key: targetId,
    socket: target.ln_socket,
  });

  await asyncRetry({interval, times}, async () => {
    await recoverFundsFromChannel({backup, lnd: cloneLnd.lnd});
  });

  await clone.generate({
    address: generateAddress,
    count: confirmationCount,
  });

  await target.generate({
    address: generateAddress,
    count: confirmationCount,
  });

  // Target should force close the channel
  {
    const {lnd} = targetLnd;

    await asyncRetry({interval, times}, async () => {
      await addPeer({
        lnd: cloneLnd.lnd,
        public_key: targetId,
        socket: target.ln_socket,
      });

      const [chan] = (await getPendingChannels({lnd})).pending_channels;

      if (!chan) {
        throw new Error('ExpectedChannelClosing');
      }
    });
  }

  // Make sure that the clone is getting the recovered funds
  {
    const {lnd} = cloneLnd;

    await asyncRetry({interval, times}, async () => {
      const [chan] = (await getPendingChannels({lnd})).pending_channels;

      await target.generate({address: generateAddress});

      if (!chan.local_balance) {
        throw new Error('ExpectedChannelClosingBalance');
      }
    });

    const [chan] = (await getPendingChannels({lnd})).pending_channels;

    strictEqual(!!chan.close_transaction_id, true, 'Close transaction id');
    strictEqual(chan.is_active, false, 'Chan no longer active');
    strictEqual(chan.is_closing, true, 'Channel is closing');
    strictEqual(chan.is_opening, false, 'Channel closing');
    strictEqual(chan.local_balance, giftTokens, 'Funds are being restored');
    strictEqual(chan.partner_public_key, targetId, 'Peer key');
    strictEqual(chan.transaction_id, channelOpen.transaction_id, 'Tx id');
    strictEqual(chan.transaction_vout, channelOpen.transaction_vout, 'Vout');
  }

  await clone.kill({});

  await target.kill({});

  return;
});
