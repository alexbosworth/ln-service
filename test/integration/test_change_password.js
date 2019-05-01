const {test} = require('tap');

const {changePassword} = require('./../macros');
const {delay} = require('./../macros');

// Changing a wallet password should change the password to the wallet
test(`Change wallet password`, async ({end, equal}) => {
  const {kill} = await changePassword({});

  kill();

  await delay(3000);

  return end();
});
