const {test} = require('tap');

const getWalletInfo = require('./../../getWalletInfo');
const signMessage = require('./../../signMessage');
const {spawnLnd} = require('./../macros');
const verifyMessage = require('./../../verifyMessage');

const message = 'message';

// Sign message should return a signature for the message
test(`Sign message`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const {signature} = await signMessage({lnd, message});
  const wallet = await getWalletInfo({lnd});

  const verified = await verifyMessage({lnd, message, signature});

  equal(verified.signed_by, wallet.public_key, 'Signature is verified');

  kill();

  return end();
});

