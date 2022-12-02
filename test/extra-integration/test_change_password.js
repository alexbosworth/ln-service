const {test} = require('@alexbosworth/tap');

const {changePassword} = require('./../macros');
const {waitForTermination} = require('./../macros');

// Changing a wallet password should change the password to the wallet
test(`Change wallet password`, async ({end, equal}) => {
  const {kill, lnd} = await changePassword({});

  kill();

  await waitForTermination({lnd});

  return end();
});
