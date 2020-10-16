const EventEmitter = require('events');

const {backupsFromSnapshot} = require('./../backups');

/** Subscribe to backup snapshot updates

  Requires `offchain:read` permission

  {
    lnd: <Authenticated LND API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'backup'
  {
    backup: <Backup Hex String>
    channels: [{
      backup: <Backup Hex String>
      transaction_id: <Funding Transaction Id Hex String>
      transaction_vout: <Funding Transaction Output Index Number>
    }]
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToBackups');
  }

  const eventEmitter = new EventEmitter();
  const subscription = lnd.default.subscribeChannelBackups({});

  // Cancel the subscription when all listeners are removed
  eventEmitter.on('removeListener', () => {
    // Exit early when there are still listeners
    if (!!eventEmitter.listenerCount('backup')) {
      return;
    }

    subscription.cancel();

    subscription.removeAllListeners();

    return;
  });

  const emitError = err => {
    subscription.cancel();

    subscription.removeAllListeners();

    // Exit early when there are no error listeners
    if (!eventEmitter.listenerCount('error')) {
      return;
    }

    eventEmitter.emit('error', err);

    return;
  };

  subscription.on('data', snapshot => {
    return backupsFromSnapshot(snapshot, (err, res) => {
      if (!!err) {
        const [code, message] = err;

        return emitError(new Errror(message));
      }

      return eventEmitter.emit('backup', res);
    });
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => emitError(err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
