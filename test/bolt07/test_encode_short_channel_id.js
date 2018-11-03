const {test} = require('tap');

const {encodeShortChannelId} = require('./../../bolt07');

const tests = [
  {
    args: {
      block_height: 1440743,
      block_index: 38,
      output_index: 0,
    },
    description: 'Standard testnet channel id',
    expected: '1584113681139367936',
  },
  {
    args: {
      block_height: 537136,
      block_index: 2080,
      output_index: 1,
    },
    description: 'Standard bitcoin channel id',
    expected: '590587277833404417',
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    const channelId = encodeShortChannelId(args);

    equal(channelId, expected, 'Channel id encoded');

    return end();
  });
});

