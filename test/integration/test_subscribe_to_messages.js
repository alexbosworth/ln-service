const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {blindedPathFromHops} = require('bolt04');
const {decryptBlindedPath} = require('bolt04');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {diffieHellmanComputeSecret} = require('./../../');
const {sendMessage} = require('./../../');
const {subscribeToMessages} = require('./../../');

const capacity = 1e6;
const interval = 10;
const size = 5;
const times = 1000;
const type = '805805';
const value = Buffer.from('hello world').toString('hex');

// Subscribing to messages should surface message events
test('Subscribe to messages', async t => {
  const {kill, nodes} = await spawnLightningCluster({size});
  const messages = {};

  const [control, alice, bob, charlie, dave] = nodes;

  const {generate, lnd} = control;

  try {
    // Dave creates a blinded path into their node, given out of band to CTRL
    const blindedPath = (() => {
      const hops = [bob.id, charlie.id, dave.id];

      const {id, key, path} = blindedPathFromHops({hops});

      return {id, key, path, introduction_node: bob.id};
    })();

    // Control listens for a reply to their message
    const subReply = subscribeToMessages({lnd});

    subReply.on('message_received', async ({encrypted, key, message})=> {
      // The message id is encrypted
      const {secret} = await diffieHellmanComputeSecret({
        lnd,
        partner_public_key: key,
      });

      const decrypted = decryptBlindedPath({encrypted, key, secret});

      messages.reply = {received_value: message.value, reply_id: decrypted.id};

      return;
    });

    // Dave listens for a message to be received on their blinded path
    const sub = subscribeToMessages({lnd: dave.lnd});

    sub.on('message_received', async ({encrypted, key, message, reply}) => {
      const {secret} = await diffieHellmanComputeSecret({
        lnd: dave.lnd,
        partner_public_key: key,
      });

      const decrypted = decryptBlindedPath({key, encrypted, secret});

      // The received id should be equal to the one given out
      if (decrypted.id !== blindedPath.id) {
        return;
      }

      await sendMessage({
        lnd: dave.lnd,
        inbound: reply.inbound.map(hop => ({
          encrypted_data: hop.encrypted_data,
          relay_key: hop.relay_key,
        })),
        key: reply.key,
        message: {type, value: message.value + message.value},
        outbound: [charlie.id, bob.id, reply.introduction_node],
      });
    });

    // Make channels between all nodes so they will relay messages
    {
      await asyncRetry({interval, times}, async () => {
        await generate({});

        await setupChannel({
          capacity,
          generate,
          lnd,
          to: alice,
        });
      });

      // Make sure that send message is supported by LND
      try {
        await sendMessage({
          lnd,
          inbound: blindedPath.path,
          key: blindedPath.key,
          message: {type, value},
          outbound: [alice.id, blindedPath.introduction_node],
          reply: [alice.id, control.id],
        });
      } catch (err) {
        await kill({});

        const [code, message] = err;

        equal(code, 501, 'Method not supported');
        equal(message, 'SendOnionMessageMethodUnsupported', 'Unknown method');

        return;
      }

      await asyncRetry({interval, times}, async () => {
        await alice.generate({});

        await setupChannel({
          capacity,
          generate: alice.generate,
          lnd: alice.lnd,
          to: bob,
        });
      });

      await asyncRetry({interval, times}, async () => {
        await bob.generate({});

        await setupChannel({
          capacity,
          generate: bob.generate,
          lnd: bob.lnd,
          to: charlie,
        });
      });

      await asyncRetry({interval, times}, async () => {
        await charlie.generate({});

        await setupChannel({
          capacity,
          generate: charlie.generate,
          lnd: charlie.lnd,
          to: dave,
        });
      });
    }

    const {reply} = await sendMessage({
      lnd,
      inbound: blindedPath.path,
      key: blindedPath.key,
      message: {type, value},
      outbound: [alice.id, blindedPath.introduction_node],
      reply: [alice.id, control.id],
    });

    // Wait for the message send and response
    await asyncRetry({interval, times}, async () => {
      if (!messages.reply) {
        throw new Error('ExpectedMessageReplyReceived');
      }

      return;
    });

    equal(messages.reply.reply_id, reply, 'Got correct message reply id');
    equal(messages.reply.received_value, value + value, 'Got message reply');

    await kill({});
  } catch (err) {
    await kill({});

    throw err;
  }
});
