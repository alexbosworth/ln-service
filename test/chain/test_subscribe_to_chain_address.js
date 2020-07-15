const EventEmitter = require('events');

const {test} = require('@alexbosworth/tap');
const {Transaction} = require('bitcoinjs-lib');

const {subscribeToChainAddress} = require('./../../');

const tests = [
  {
    args: {
      min_confirmations: 6,
      min_height: 100,
      output_script: 'a914898ffd60ad6091221250047a9f2bd6456190263487',
      transaction_id: Buffer.alloc(32).toString('hex'),
    },
    description: 'Confirmation emitted for output script',
    emitter: new EventEmitter(),
    expected: {
      block: Buffer.alloc(32).toString('hex'),
      height: 200,
      transaction: (new Transaction()).toHex(),
    },
  },
  {
    args: {
      min_confirmations: 6,
      min_height: 100,
      p2sh_address: '3EENzQdQS3BvvnkeJjC5uVwUKFuTczpnok',
      transaction_id: Buffer.alloc(32).toString('hex'),
    },
    description: 'Confirmation on p2sh emitted',
    emitter: new EventEmitter(),
    expected: {
      block: Buffer.alloc(32).toString('hex'),
      height: 200,
      transaction: (new Transaction()).toHex(),
    },
  },
  {
    args: {},
    description: 'Lnd is required to subscribe',
    error: 'ExpectedLndGrpcApiToSubscribeToChainTransaction',
  },
  {
    args: {lnd: {chain: {}}},
    description: 'Min height is required',
    error: 'ExpectedMinHeightToSubscribeToChainAddress',
  },
  {
    args: {lnd: {chain: {}}, min_height: 1},
    description: 'An output to watch for is required',
    error: 'ExpectedChainAddressToSubscribeForConfirmationEvents',
  },
];

tests.forEach(({args, description, emitter, error, expected}) => {
  return test(description, ({end, equal, throws}) => {
    if (!!error) {
      throws(() => subscribeToChainAddress(args), new Error(error), 'Got err');

      return end();
    }

    args.lnd = {chain: {registerConfirmationsNtfn: ({}) => emitter}};

    const sub = subscribeToChainAddress(args);

    sub.on('confirmation', ({block, height, transaction}) => {
      equal(block, expected.block, 'Got block');
      equal(height, expected.height, 'Got height');
      equal(transaction, expected.transaction, 'Got transaction');

      return end();
    });

    emitter.emit('data', {
      conf: {
        block_hash: Buffer.alloc(32),
        block_height: 200,
        raw_tx: (new Transaction()).toBuffer(),
      },
    });

    return;
  });
});
