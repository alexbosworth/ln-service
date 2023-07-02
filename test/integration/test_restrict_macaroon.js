const {rejects} = require('node:assert').strict;
const {strictEqual} = require('node:assert').strict;
const test = require('node:test');

const {spawnLightningCluster} = require('ln-docker-daemons');

const {createChainAddress} = require('./../../');
const {grantAccess} = require('./../../');
const {restrictMacaroon} = require('./../../');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const format = 'p2wpkh';
const ip = '127.0.0.1';
const methods = ['createChainAddress'];
const wrongIp = '203.0.113.0';

// Restricting the macaroon credentials should result in access limitation
test(`Restricted macaroons restrict access`, async () => {
  const [{lnd, kill, rpc}] = (await spawnLightningCluster({})).nodes;

  try {
    const create = await grantAccess({lnd, methods});

    // A regular macaroon can create a chain address
    await createChainAddress({
      format,
      lnd: rpc({macaroon: create.macaroon}).lnd,
    });

    // A macaroon that is ip limited to the wrong ip is rejected
    {
      const {macaroon} = restrictMacaroon({
        ip: wrongIp,
        macaroon: create.macaroon,
      });

      await rejects(
        createChainAddress({format, lnd: rpc({macaroon}).lnd}),
        [503, 'UnexpectedErrorCreatingAddress'],
        'Does not allow incorrect ip'
      );

      const addRestriction = restrictMacaroon({ip, macaroon});

      const addedLnd = rpc({macaroon: addRestriction.macaroon});

      await rejects(
        createChainAddress({format, lnd: addedLnd.lnd}),
        [503, 'UnexpectedErrorCreatingAddress'],
        'Does not allow extended ip'
      );
    }

    // A macaroon that is time limited is allowed at first
    {
      const {macaroon} = restrictMacaroon({
        expires_at: new Date(Date.now() + 1000).toISOString(),
        macaroon: create.macaroon,
      });

      // A time-limited macaroon should work within its time frame
      await createChainAddress({format, lnd: rpc({macaroon}).lnd});

      // Wait until the macaroon expires
      await delay(2000);

      // A macaroon that is expired is not allowed
      await rejects(
        createChainAddress({format, lnd: rpc({macaroon}).lnd}),
        [503, 'UnexpectedErrorCreatingAddress'],
        'Does not allow expired macaroon'
      );

      // Try extending the time of the macaroon to get around the timer
      const addTime = restrictMacaroon({
        macaroon,
        expires_at: new Date(Date.now() + 1000).toISOString(),
      });

      const addedLnd = rpc({macaroon: addTime.macaroon});

      // Adding time is also not allowed
      await rejects(
        createChainAddress({format, lnd: addedLnd.lnd}),
        [503, 'UnexpectedErrorCreatingAddress'],
        'Does not allow extending expired macaroon'
      );
    }
  } catch (err) {
    strictEqual(err, null, 'Expected no error restricting macaroon');
  }

  await kill({});

  return;
});
