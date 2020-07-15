const EventEmitter = require('events');

const {test} = require('@alexbosworth/tap');
const {Transaction} = require('bitcoinjs-lib');

const {subscribeToChainSpend} = require('./../../');

const tests = [
  {
    args: {
      min_height: 100,
      output_script: 'a914898ffd60ad6091221250047a9f2bd6456190263487',
      transaction_id: Buffer.alloc(32).toString('hex'),
      transaction_vout: 0,
    },
    description: 'Confirmation emitted for chain spend',
    expected: {
      height: 200,
      transaction: (new Transaction()).toHex(),
      vin: 0,
    },
  },
  {
    args: {},
    description: 'An lnd is required',
    error: 'ExpectedLndGrpcApiToSubscribeToSpendConfirmations',
  },
  {
    args: {lnd: {chain: {registerSpendNtfn: () => {}}}},
    description: 'Min height is required',
    error: 'ExpectedMinHeightToSubscribeToChainSpend',
  },
  {
    args: {lnd: {chain: {registerSpendNtfn: () => {}}}, min_height: 1},
    description: 'An address or output script is required',
    error: 'ExpectedRecognizedAddressFormatToWatchForSpend',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({end, equal, throws}) => {
    if (!!error) {
      throws(() => subscribeToChainSpend(args), new Error(error), 'Got error');

      return end();
    }

    const emitter = new EventEmitter();

    args.lnd = {chain: {registerSpendNtfn: ({}) => emitter}};

    const sub = subscribeToChainSpend(args);

    sub.on('confirmation', ({height, transaction, vin}) => {
      equal(height, expected.height, 'Got height');
      equal(transaction, expected.transaction, 'Got transaction');
      equal(vin, expected.vin, 'Got vin');

      return end();
    });

    emitter.emit('data', {
      spend: {
        raw_spending_tx: (new Transaction()).toBuffer(),
        spending_height: 200,
        spending_input_index: 0,
      },
    });

    return;
  });
});
