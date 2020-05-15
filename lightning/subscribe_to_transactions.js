const EventEmitter = require('events');

const {rpcTxAsTransaction} = require('lightning/lnd_responses');

const {isArray} = Array;

/** Subscribe to transactions

  Requires `onchain:read` permission

  In LND 0.7.1 `confirmation_height` is not supported

  {
    lnd: <Authenticated LND API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'chain_transaction'
  {
    [block_id]: <Block Hash String>
    [confirmation_count]: <Confirmation Count Number>
    [confirmation_height]: <Confirmation Block Height Number>
    created_at: <Created ISO 8601 Date String>
    [fee]: <Fees Paid Tokens Number>
    id: <Transaction Id String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Transaction Outbound Bool>
    output_addresses: [<Address String>]
    tokens: <Tokens Including Fee Number>
    [transaction]: <Raw Transaction Hex String>
  }
*/
module.exports = ({lnd}) => {
  if (!lnd || !lnd.default || !lnd.default.subscribeTransactions) {
    throw new Error('ExpectedAuthenticatedLndToSubscribeToTransactions');
  }

  const eventEmitter = new EventEmitter();
  const subscription = lnd.default.subscribeTransactions({});

  const emitErr = err => {
    // Exit early when there are no listeners on error
    if (!eventEmitter.listenerCount('error')) {
      return;
    }

    if (isArray(err)) {
      return eventEmitter.emit('error', err);
    }

    return eventEmitter.emit('error', [503, 'UnexpectedChainTxSubErr', {err}]);
  };

  subscription.on('data', tx => {
    try {
      return eventEmitter.emit('chain_transaction', rpcTxAsTransaction(tx));
    } catch (err) {
      return emitErr([503, err.message]);
    }
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('error', err => emitErr(err));
  subscription.on('status', status => eventEmitter.emit('status', status));

  return eventEmitter;
};
