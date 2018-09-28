const {test} = require('tap');

const createInvoice = require('./../../createInvoice');
const decodePaymentRequest = require('./../../decodePaymentRequest');
const {spawnLnd} = require('./../macros');

const description = 'description';
const expiresAt = new Date().toISOString();
const secret = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
const secretHash = '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925';
const tokens = 4194304;

// decodePaymentRequest should result in a decoded payment request
test(`Decode a payment request`, async ({end, equal}) => {
  const {kill, lnd} = await spawnLnd({});

  const {request} = await createInvoice({
    description,
    lnd,
    secret,
    tokens,
    expires_at: expiresAt,
  });

  const decoded = await decodePaymentRequest({lnd, request});

  equal(decoded.chain_address, undefined, 'No fallback chain address');
  equal(decoded.description, 'description', 'Invoice encodes description');
  equal(decoded.id, secretHash, 'Payment hash matches preimage');
  equal(decoded.tokens, tokens, 'Request made for specified tokens amount');
  equal(decoded.type, 'payment_request', 'Row type is payment request');

  kill();

  return end();
});

