const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getIdentity} = require('./../../');

const tests = [
  {
    description: "Test invoice",
    expected: {
      cltv_delta: 99,
      description: 'Read: Global Cryptocurrency Regulation',
      id: '7426ba0604c3f8682c7016b44673f85c5bd9da2fa6c1080810cf53ae320c9863',
      mtokens: '150000',
      secret: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
      safe_tokens: 150,
      tokens: 150,
    },
  },
];

tests.forEach(({description, expected}) => {
  return test(description, async ({end, equal}) => {
    const [{kill, lnd}] = (await spawnLightningCluster({})).nodes;

    try {
      const {request} = await createInvoice({
        lnd,
        cltv_delta: expected.cltv_delta,
        description: expected.description,
        secret: expected.secret,
        tokens: expected.tokens,
      });

      const decoded = await decodePaymentRequest({lnd, request});

      equal(decoded.chain_addresses, expected.chain_addresses, 'Chain addr');
      equal(decoded.cltv_delta, expected.cltv_delta, 'Decode cltv delta');
      equal(!!decoded.created_at, true, 'Created at date');
      equal(decoded.description, expected.description, 'Decode description');
      equal(decoded.description_hash, expected.description_hash, 'Desc hash');
      equal(decoded.destination, (await getIdentity({lnd})).public_key, 'Pk');
      equal(!!decoded.expires_at, true, 'Expiration date decoded');
      equal(decoded.id, expected.id, 'Decoded payment hash');
      equal(decoded.mtokens, expected.mtokens, 'Decode millitokens');
      equal(decoded.safe_tokens, expected.safe_tokens, 'Decode safe amount');
      equal(decoded.tokens, expected.tokens, 'Decode tokens amount');
    } catch (err) {
      equal(err, null, 'Expected no error');
    }

    await kill({});

    return end();
  });
});
