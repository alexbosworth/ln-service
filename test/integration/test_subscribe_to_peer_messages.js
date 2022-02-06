const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {addPeer} = require('./../../');
const {sendMessageToPeer} = require('./../../');
const {subscribeToPeerMessages} = require('./../../');

const interval = 10;
const size = 3;
const times = 1000;

// Messages should be received from peers
test(`Subscribe to peer messages`, async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{lnd}, target, remote] = nodes;

  try {
    await asyncRetry({interval, times}, async () => {
      await addPeer({
        lnd,
        public_key: target.id,
        socket: target.socket,
      });
    });

    await addPeer({
      lnd: target.lnd,
      public_key: remote.id,
      socket: remote.socket,
    });

    try {
      await sendMessageToPeer({
        lnd,
        message: Buffer.from('message').toString('hex'),
        public_key: target.id,
      });
    } catch (err) {
      const [code] = err;

      // Send message to peer is not supported on LND 0.13.4 or lower
      if (code === 501) {
        await kill({});

        return end();
      }
    }

    const messages = [];
    const targetSub = subscribeToPeerMessages({lnd: target.lnd});
    const remoteSub = subscribeToPeerMessages({lnd: remote.lnd});
    const targetMessages = [];

    remoteSub.on('message_received', message => messages.push(message));

    targetSub.on('message_received', async ({message, type}) => {
      targetMessages.push(message);

      if (type !== 40805) {
        return;
      }

      // Wait for message to appear
      return await asyncRetry({interval, times}, async () => {
      // Relay message from control to remote
        await sendMessageToPeer({
          message,
          type,
          lnd: target.lnd,
          public_key: remote.id,
        });

        if (!messages.length) {
          throw new Error('ExpectedMessage');
        }
      });
    });

    // Wait for message to appear
    await asyncRetry({interval, times}, async () => {
      // Control send a message to target peer
      await sendMessageToPeer({
        lnd,
        message: Buffer.from('message to remote').toString('hex'),
        public_key: target.id,
        type: 40805,
      });

      if (!targetMessages.length) {
        throw new Error('ExpectedTargetMessageReceived');
      }
    });

    // Wait for message to appear
    await asyncRetry({interval, times}, async () => {
      if (!messages.length) {
        throw new Error('ExpectedMessage');
      }
    });

    const [message] = messages;

    strictSame(
      message,
      {
        message: Buffer.from('message to remote').toString('hex'),
        public_key: target.id,
        type: 40805,
      },
      'Message successfully relayed through target'
    );
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
