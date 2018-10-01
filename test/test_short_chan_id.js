const {equal} = require('tap');

const {decodeFromNumber} = require('./../bolt07');
const {encodeShortChannelId} = require('./../bolt07');

const tests = [
  {
    block_height: (1 << 24) - 1,
    block_index: (1 << 24) - 1,
    output_index: (1 << 16) - 1,
  },
  {
    block_height: 2304934,
    block_index: 2345,
    output_index: 5,
  },
  {
    block_height: 9304934,
    block_index: 2345,
    output_index: 5233,
  },
];

tests.forEach(test => {
  const id = encodeShortChannelId(test);

  const components = decodeFromNumber({id});

  equal(components.block_height, test.block_height);
  equal(components.block_index, test.block_index);
  equal(components.output_index, test.output_index);

  return;
});

