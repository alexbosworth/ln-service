const {test} = require('tap');

const {decodeShortChannelId} = require('./../../');

const tests = [
  {
    args: {id: '1584113681139367936'},
    description: 'Standard testnet channel id',
    expected: {
      block_height: 1440743,
      block_index: 38,
      output_index: 0,
    },
  },
  {
    args: {id: '590587277833404417'},
    description: 'Standard bitcoin channel id',
    expected: {
      block_height: 537136,
      block_index: 2080,
      output_index: 1,
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({deepIs, end}) => {
    const decoded = decodeShortChannelId(args);

    deepIs(decoded, expected, 'Channel id decoded');

    return end();
  });
});

