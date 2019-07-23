const EventEmitter = require('events');

const {test} = require('tap');
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
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
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
