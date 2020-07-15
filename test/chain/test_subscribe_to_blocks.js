const EventEmitter = require('events');

const {test} = require('@alexbosworth/tap');

const {subscribeToBlocks} = require('./../../');

const blockEmitter = new EventEmitter();

const tests = [
  {
    args: {lnd: {chain: {registerBlockEpochNtfn: ({}) => blockEmitter}}},
    description: 'Block data emitted',
    expected: {height: 1, id: Buffer.alloc(32).toString('hex')},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    const sub = subscribeToBlocks(args);

    sub.once('block', ({height, id}) => {
      equal(height, expected.height, 'Got height');
      equal(id, expected.id, 'Got id');

      return end();
    });

    blockEmitter.emit('data', {
      hash: Buffer.from(expected.id, 'hex'),
      height: expected.height,
    });

    return;
  });
});
