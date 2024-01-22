const {deepStrictEqual} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const asyncRetry = require('async/retry');
const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');

const {addPeer} = require('./../../');
const {createInvoice} = require('./../../');
const {getForwards} = require('./../../');
const {pay} = require('./../../');

const delay = n => new Promise(resolve => setTimeout(resolve, n));
const interval = 100;
const limit = 1;
const size = 3;
const times = 1000;
const tokens = 100;

// Getting forwarded payments should return all forwarded payments
test('Get forwards', async () => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target, remote] = nodes;

  await asyncRetry({interval, times}, async () => {
    await addPeer({lnd, public_key: remote.id, socket: remote.socket});

    await setupChannel({generate, lnd, to: target});

    await setupChannel({
      lnd: target.lnd,
      generate: target.generate,
      to: remote,
    });
  });

  await addPeer({lnd, public_key: remote.id, socket: remote.socket});

  await delay(2000);

  for (let i = 0, l = remote.lnd; i < 3; i++) {
    await asyncRetry({interval, times}, async () => {
      await delay(1000);

      await pay({
        lnd,
        request: (await createInvoice({lnd: l, tokens: tokens + i})).request,
      });
    });
  }

  const page1 = await getForwards({limit, lnd: target.lnd});

  strictEqual(!!page1.next, true, 'Page 1 leads to page 2');

  {
    const [forward] = page1.forwards;

    strictEqual(!!forward.created_at, true, 'Forward created at');
    strictEqual(forward.fee, 1, 'Forward fee charged');
    strictEqual(forward.fee_mtokens, '1000', 'Forward fee charged');
    strictEqual(!!forward.incoming_channel, true, 'Forward incoming channel');
    strictEqual(forward.tokens, 100, 'Forwarded tokens count');
    strictEqual(!!forward.outgoing_channel, true, 'Forward outgoing channel');
  }

  const page2 = await getForwards({lnd: target.lnd, token: page1.next});

  strictEqual(!!page2.next, true, 'Page 2 leads to page 3');

  {
    const [forward] = page2.forwards;

    strictEqual(forward.tokens, 101, 'Second forward tokens count');
  }

  const page3 = await getForwards({lnd: target.lnd, token: page2.next});

  strictEqual(!!page3.next, true, 'Page 3 leads to page 4');

  {
    const [forward] = page3.forwards;

    strictEqual(forward.tokens, 102, 'Third forward tokens count');

    // Check "before" based paging
    const prev0 = await getForwards({
      limit,
      before: forward.created_at,
      lnd: target.lnd,
    });

    const [firstForward] = prev0.forwards;

    strictEqual(firstForward.tokens, 100, 'Previous row #1');

    const prev1 = await getForwards({lnd: target.lnd, token: prev0.next});

    const [secondForward] = prev1.forwards;

    strictEqual(secondForward.tokens, 101, 'Previous row #2');

    const prev2 = await getForwards({lnd: target.lnd, token: prev1.next});

    strictEqual(prev2.next, undefined, 'Ended paging of previous rows');

    // Check "after" based paging
    const after0 = await getForwards({
      limit,
      before: forward.created_at,
      after: firstForward.created_at,
      lnd: target.lnd,
    });

    deepStrictEqual(after0.forwards, prev0.forwards, 'After is inclusive');

    const after1 = await getForwards({lnd: target.lnd, token: after0.next});

    deepStrictEqual(after1.forwards, prev1.forwards, 'Iterating before');

    const after2 = await getForwards({lnd: target.lnd, token: after1.next});

    strictEqual(after2.next, undefined, 'Before is non-inclusive');
  }

  const page4 = await getForwards({lnd: target.lnd, token: page3.next});

  strictEqual(page4.forwards.length, [].length, 'Page 4 has no results');
  strictEqual(page4.next, undefined, 'Page 4 leads to nowhere');

  await kill({});

  return;
});
