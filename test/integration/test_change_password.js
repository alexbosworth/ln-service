const {test} = require('tap');

const {changePassword} = require('./../macros');
const {delay} = require('./../macros');

// Getting the wallet info should return info about the wallet
test(`Get wallet info`, async ({end, equal}) => {
  const {kill} = await changePassword({});

  kill();

  await delay(3000);

  return end();
});
