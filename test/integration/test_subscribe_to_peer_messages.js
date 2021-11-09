const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {sendMessageToPeer} = require('./../../');
const {subscribeToPeerMessages} = require('./../../');

const interval = 10;
const times = 1000;

// Messages should be received from peers
test(`Subscribe to peer messages`, async ({end, equal, strictSame}) => {
  const cluster = await createCluster({});

  const {lnd} = cluster.control;

  try {
    await sendMessageToPeer({
      lnd,
      message: Buffer.from('message').toString('hex'),
      public_key: cluster.target.public_key,
    });
  } catch (err) {
    const [code] = err;

    // Send message to peer is not supported on LND 0.13.4 or lower
    if (code === 501) {
      await cluster.kill({});

      return end();
    }
  }

  const targetSub = subscribeToPeerMessages({lnd: cluster.target.lnd});
  const remoteSub = subscribeToPeerMessages({lnd: cluster.remote.lnd});

  const messages = [];

  remoteSub.on('message_received', message => messages.push(message));

  targetSub.on('message_received', async ({message, type}) => {
    if (type !== 40805) {
      return;
    }

    // Relay message from control to remote
    return await sendMessageToPeer({
      message,
      type,
      lnd: cluster.target.lnd,
      public_key: cluster.remote.public_key,
    });
  });

  // Control send a message to target peer
  await sendMessageToPeer({
    lnd,
    message: Buffer.from('message to remote').toString('hex'),
    public_key: cluster.target.public_key,
    type: 40805,
  });

  // Wait for message to appear
  await asyncRetry({interval, times}, async () => {
    if (!messages.length) {
      throw new Error('ExpectedMessage');
    }
  });

  strictSame(
    messages,
    [{
      message: Buffer.from('message to remote').toString('hex'),
      public_key: cluster.target.public_key,
      type: 40805,
    }],
    'Message successfully relayed through target'
  );

  await cluster.kill({});

  return end();
});
