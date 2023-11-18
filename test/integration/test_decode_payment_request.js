const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {createInvoice} = require('./../../');
const {decodePaymentRequest} = require('./../../');
const {getIdentity} = require('./../../');
const {getWalletInfo} = require('./../../');

const interval = 50;
const times = 4000;

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
  return test(description, async () => {
    const [{generate, kill, lnd}] = (await spawnLightningCluster({})).nodes;

    await asyncRetry({interval, times}, async () => {
      const wallet = await getWalletInfo({lnd});

      await generate({});

      if (!wallet.is_synced_to_chain) {
        throw new Error('NotSyncedToChain');
      }
    });

    try {
      const {request} = await createInvoice({
        lnd,
        cltv_delta: expected.cltv_delta,
        description: expected.description,
        secret: expected.secret,
        tokens: expected.tokens,
      });

      const decoded = await decodePaymentRequest({lnd, request});
      const identity = (await getIdentity({lnd})).public_key;

      strictEqual(decoded.chain_addresses, expected.chain_addresses, 'Addr');
      strictEqual(decoded.cltv_delta, expected.cltv_delta, 'Decode cltv');
      strictEqual(!!decoded.created_at, true, 'Created at date');
      strictEqual(decoded.description, expected.description, 'Decode desc');
      strictEqual(decoded.description_hash, expected.description_hash, 'Hash');
      strictEqual(decoded.destination, identity, 'Got public key');
      strictEqual(!!decoded.expires_at, true, 'Expiration date decoded');
      strictEqual(decoded.id, expected.id, 'Decoded payment hash');
      strictEqual(decoded.mtokens, expected.mtokens, 'Decode millitokens');
      strictEqual(decoded.safe_tokens, expected.safe_tokens, 'Safe amount');
      strictEqual(decoded.tokens, expected.tokens, 'Decode tokens amount');
    } catch (err) {
      strictEqual(err, null, 'Expected no error');
    }

    await kill({});

    return;
  });
});
