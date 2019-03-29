const EventEmitter = require('events');

const blockHashByteLen = 32;

/** Subscribe to blocks

  {
    lnd: <Chain Notifier LND GRPC API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @on(data)
  {
    height: <Block Height Number>
    id: <Block Hash String>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd) {
    throw new Error('ExpectedLndToSubscribeToBlocks');
  }

  const eventEmitter = new EventEmitter();
  const sub = lnd.registerBlockEpochNtfn({});

  sub.on('end', () => eventEmitter.emit('end'));
  sub.on('status', n => eventEmitter.emit('status', n));

  sub.on('error', err => {
    eventEmitter.emit('error', new Error('UnexpectedErrInBlocksSubscription'));

    return;
  });

  sub.on('data', data => {
    if (!Buffer.isBuffer(data.hash)) {
      eventEmitter.emit('error', new Error('ExpectedBlockHashInAnnouncement'));
    }

    if (data.hash.length !== blockHashByteLen) {
      eventEmitter.emit('error', new Error('UnexpectedBlockEventHashLength'));
    }

    if (!data.height) {
      eventEmitter.emit('error', new Error('ExpectedHeightInBlockEvent'));
    }

    eventEmitter.emit('data', {
      height: data.height,
      id: data.hash.toString('hex'),
    });
  });

  return eventEmitter;
};
