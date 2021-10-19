const asyncRetry = require('async/retry');
const {test} = require('@alexbosworth/tap');

const {createCluster} = require('./../macros');
const {sendMessageToPeer} = require('./../../');
const {subscribeToPeerMessages} = require('./../../');

const interval = 10;
const times = 1000;

// Sending a message to a peer should result in the message received
test(`Send peer message`, async ({end, equal, strictSame}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.control;

  try {
    await sendMessageToPeer({
      lnd,
      message: Buffer.from('message').toString('hex'),
      public_key: cluster.target.public_key,
    });
  } catch (err) {
    const [code] = err;

    // Send message to peer is not supported on LND 0.13.3 or lower
    if (code === 501) {
      await cluster.kill({});

      return end();
    }
  }

  const sub = subscribeToPeerMessages({lnd: cluster.target.lnd});

  const messages = [];

  sub.on('message_received', message => messages.push(message));

  await sendMessageToPeer({
    lnd,
    message: Buffer.from('message').toString('hex'),
    public_key: cluster.target.public_key,
  });

  await asyncRetry({interval, times}, async () => {
    if (!messages.length) {
      throw new Error('ExpectedMessage');
    }
  });

  strictSame(
    messages,
    [{
      message: Buffer.from('message').toString('hex'),
      public_key: cluster.control.public_key,
      type: 32768,
    }],
    'Message successfully sent to peer'
  );

  await cluster.kill({});

  return end();
});
