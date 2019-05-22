const {address} = require('bitcoinjs-lib');
const {test} = require('tap');

const createChainAddress = require('./../../createChainAddress');
const {createCluster} = require('./../macros');
const {delay} = require('./../macros');
const getChainFeeEstimate = require('./../../getChainFeeEstimate');

const expectedFee = 9750;
const expectedFeeRate = 50;
const format = 'p2wpkh';
const tokens = 1e6;

// Getting a chain fee estimate should return an estimate of the chain fee
test(`Get chain fee estimate`, async ({end, equal}) => {
  const cluster = await createCluster({is_remote_skipped: true});

  const {lnd} = cluster.target;

  const address1 = (await createChainAddress({format, lnd})).address;
  const address2 = (await createChainAddress({format, lnd})).address;

  const estimate = await getChainFeeEstimate({
    lnd: cluster.control.lnd,
    send_to: [
      {address: address1, tokens: tokens / [address1, address2].length},
      {address: address2, tokens: tokens / [address1, address2].length},
    ],
  });

  equal(estimate.fee, expectedFee, 'Total fee is estimated');
  equal(estimate.tokens_per_vbyte, expectedFeeRate, 'Fee per vbyte is given');

  await cluster.kill({});

  return end();
});
