const {setupChannel} = require('ln-docker-daemons');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {isDestinationPayable} = require('./../../');

const size = 2;
const tokens = 1e6 / 2;

// Determining if a route is payable should indicate if a route can be found
test('Is destination payable', async ({end, equal, strictSame}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [{generate, lnd}, target] = nodes;

  try {
    await setupChannel({generate, lnd, to: target});

    const canPay = await isDestinationPayable({lnd, destination: target.id});

    strictSame(canPay, {is_payable: true}, 'Can pay with default amount');

    const canPayTokens = await isDestinationPayable({
      lnd,
      tokens,
      destination: target.id,
    });

    strictSame(canPayTokens, {is_payable: true}, 'Can pay with tokens amount');

    const canPayMtokens = await isDestinationPayable({
      lnd,
      mtokens: tokens,
      destination: target.id,
    });

    strictSame(canPayMtokens, {is_payable: true}, 'Can pay with mtokens sum');
  } catch (err) {
    equal(err, null, 'Expected no error');
  } finally {
    await kill({});
  }

  return end();
});
