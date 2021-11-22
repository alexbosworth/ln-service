const asyncRetry = require('async/retry');
const {spawnLightningCluster} = require('ln-docker-daemons');
const {test} = require('@alexbosworth/tap');

const {createChainAddress} = require('./../../');
const {getChainBalance} = require('./../../');
const {sendToChainAddresses} = require('./../../');

const regtestBech32AddressHrp = 'bcrt';
const size = 2;
const times = 10;
const tokens = 1e6;
const txIdHexByteLength = 64;

// Sending to chain addresses should result in on-chain sent funds
test(`Send to chain address`, async ({end, equal}) => {
  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target] = nodes;

  const {generate, lnd} = target;

  const address1 = (await createChainAddress({lnd})).address;
  const address2 = (await createChainAddress({lnd})).address;

  await asyncRetry({times: 150}, async () => {
    if (!(await getChainBalance({lnd: control.lnd})).chain_balance) {
      await control.generate({});

      throw new Error('ExpectedChainBalance');
    }
  });

  const startBalance = await getChainBalance({lnd});

  const sent = await sendToChainAddresses({
    fee_tokens_per_vbyte: 1,
    lnd: control.lnd,
    send_to: [
      {address: address1, tokens: tokens / [address1, address2].length},
      {address: address2, tokens: tokens / [address1, address2].length},
    ],
  });

  equal(sent.id.length, txIdHexByteLength, 'Transaction id is returned');
  equal(sent.is_confirmed, false, 'Transaction is not yet confirmed');
  equal(sent.is_outgoing, true, 'Transaction is outgoing');
  equal(sent.tokens, tokens, 'Tokens amount matches tokens sent');

  await asyncRetry({times}, async () => {
    // Generate to confirm the tx
    await control.generate({});

    const endBalance = await getChainBalance({lnd});

    const adjustment = endBalance.chain_balance - startBalance.chain_balance;

    if (!adjustment) {
      throw new Error('WaitingForAdjustment');
    }

    equal(adjustment, tokens, 'Transaction balance is shifted');
  })

  await kill({});

  return end();
});
