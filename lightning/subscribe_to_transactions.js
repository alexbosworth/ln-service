const EventEmitter = require('events');

const rowTypes = require('./conf/row_types');

const decBase = 10;
const msPerSec = 1e3;

/** Subscribe to transactions

  {
    lnd: <LND GRPC API Object>
  }

  @returns
  <EventEmitter Object>

  @on(data)
  {
    [block_id]: <Block Hash String>
    confirmation_count: <Confirmation Count Number>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Transaction Outbound Bool>
    fee: <Fees Paid Tokens Number>
    id: <Transaction Id String>
    tokens: <Tokens Number>
    type: <Type String>
  }
*/
module.exports = ({lnd}) => {
  const eventEmitter = new EventEmitter();
  const subscription = lnd.subscribeTransactions({});

  subscription.on('data', tx => {
    if (!tx || !tx.time_stamp) {
      return eventEmitter.emit('error', new Error('ExpectedTxTimestamp'));
    }

    if (!tx.tx_hash) {
      return eventEmitter.emit('error', new Error('ExpectedTransactionId'));
    }

    const createdAt = parseInt(tx.time_stamp, decBase);

    return eventEmitter.emit('data', {
      block_id: tx.block_hash || null,
      confirmation_count: tx.num_confirmations,
      created_at: new Date(createdAt * msPerSec).toISOString(),
      is_confirmed: !!tx.block_hash,
      is_outgoing: parseInt(tx.amount, decBase) < 0,
      fee: parseInt(tx.total_fees, decBase),
      id: tx.tx_hash,
      tokens: Math.abs(parseInt(tx.amount, decBase)),
      type: rowTypes.chain_transaction,
    });
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => eventEmitter.emit('error', err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};

