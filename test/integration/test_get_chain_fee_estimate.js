const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainFeeEstimate} = require('./../../');

const expectedFee = 9250;
const expectedFeeRate = 50;
const format = 'np2wpkh';
const size = 2;
const times = 200;
const tokens = 1e6;

// Getting a chain fee estimate should return an estimate of the chain fee
test(`Get chain fee estimate`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, {lnd}] = nodes;

  const address1 = (await createChainAddress({lnd})).address;
  const address2 = (await createChainAddress({format, lnd})).address;

  // Generate coins for the node
  await asyncRetry({times}, async () => {
    if (!(await getChainBalance({lnd: control.lnd})).chain_balance) {
      await control.generate({});

      throw new Error('ExpectedChainBalance');
    }
  });

  const estimate = await getChainFeeEstimate({
    lnd: control.lnd,
    send_to: [
      {address: address1, tokens: tokens / [address1, address2].length},
      {address: address2, tokens: tokens / [address1, address2].length},
    ],
  });

  // LND 0.15.4 and below uses P2WPKH as change
  if (estimate.fee === 8650) {
    equal(estimate.fee, 8650, 'Total fee is estimated');
  } else {
    equal(estimate.fee, expectedFee, 'Total fee is estimated');
  }

  equal(estimate.tokens_per_vbyte, expectedFeeRate, 'Fee per vbyte is given');

  await kill({});

  return end();
});
