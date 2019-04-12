const EventEmitter = require('events');

const {backupsFromSnapshot} = require('./../backups');

/** Subscribe to backup snapshot updates

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <EventEmitter Object>

  @on('data')
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
  const eventEmitter = new EventEmitter();
  const subscription = lnd.subscribeChannelBackups({});

  subscription.on('data', snapshot => {
    return backupsFromSnapshot(snapshot, (err, res) => {
      if (!!err) {
        const [code, message] = err;

        return eventEmitter('error', new Error(message));
      }

      return eventEmitter.emit('data', res);
    });
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => eventEmitter.emit('error', err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
