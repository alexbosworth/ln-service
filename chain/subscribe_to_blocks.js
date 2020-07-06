const EventEmitter = require('events');

const blockHashByteLen = 32;

/** Subscribe to blocks

  This method will also immediately emit the current height and block id

  Requires LND built with `chainrpc` build tag

  Requires `onchain:read` permission

  {
    lnd: <Authenticated LND Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'block'
  {
    height: <Block Height Number>
    id: <Block Hash Hex String>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.chain || !lnd.chain.registerBlockEpochNtfn) {
    throw new Error('ExpectedLndToSubscribeToBlocks');
  }

  const eventEmitter = new EventEmitter();
  const sub = lnd.chain.registerBlockEpochNtfn({});

  sub.on('end', () => eventEmitter.emit('end'));
  sub.on('status', n => eventEmitter.emit('status', n));

  sub.on('error', err => {
    // Exit early when there are no error listeners
    if (!eventEmitter.listenerCount('error')) {
      return;
    }

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

    eventEmitter.emit('block', {
      height: data.height,
      id: data.hash.toString('hex'),
    });
  });

  return eventEmitter;
};
