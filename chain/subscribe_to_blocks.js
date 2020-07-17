const EventEmitter = require('events');

const blockHashByteLen = 32;
const event = 'block';
const {isBuffer} = Buffer;

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

  // Cancel the subscription when all listeners are removed
  eventEmitter.on('removeListener', () => {
    // Exit early when there are still listeners on the subscription
    if (!!eventEmitter.listenerCount(event)) {
      return;
    }

    sub.cancel();

    return;
  });

  const emitError = err => {
    sub.cancel();

    sub.removeAllListeners();

    // Exit early when there are no error listeners
    if (!eventEmitter.listenerCount('error')) {
      return;
    }

    eventEmitter.emit('error', err);

    return;
  };

  sub.on('error', err => {
    return emitError([503, 'UnexpectedErrInBlocksSubscription', {err}]);
  });

  sub.on('data', data => {
    if (!isBuffer(data.hash)) {
      return emitError([503, 'ExpectedBlockHashInAnnouncement']);
    }

    if (data.hash.length !== blockHashByteLen) {
      return emitError([503, 'UnexpectedBlockEventHashLength']);
    }

    if (!data.height) {
      return emitError([503, 'ExpectedHeightInBlockEvent']);
    }

    eventEmitter.emit(event, {
      height: data.height,
      id: data.hash.toString('hex'),
    });
  });

  return eventEmitter;
};
