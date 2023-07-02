const {deepEqual} = require('node:assert').strict;
const {equal} = require('node:assert').strict;
const test = require('node:test');

const asyncEach = require('async/each');
const asyncMap = require('async/map');
const asyncRetry = require('async/retry');
const {combinePsbts} = require('psbt');
const {createPsbt} = require('psbt');
const {decodePsbt} = require('psbt');
const {extractTransaction} = require('psbt');
const {finalizePsbt} = require('psbt');
const {spawnLightningCluster} = require('ln-docker-daemons');
const tinysecp = require('tiny-secp256k1');
const {Transaction} = require('bitcoinjs-lib');
const {updatePsbt} = require('psbt');

const {broadcastChainTransaction} = require('./../../');
const {createChainAddress} = require('./../../');
const {fundPsbt} = require('./../../');
const {getChainBalance} = require('./../../');
const {getChainTransactions} = require('./../../');
const {getUtxos} = require('./../../');
const {partiallySignPsbt} = require('./../../');
const {sendToChainAddresses} = require('./../../');

const count = 150;
const flatten = arr => [].concat(...arr);
const interval = 10;
const size = 3;
const startingFunds = 1e7;
const times = 1000;
const tokens = 1e6;

// Partially signing a PSBT should result in a partially signed PSBT
test(`Partially sign PSBT`, async () => {
  const ecp = (await import('ecpair')).ECPairFactory(tinysecp);

  const {kill, nodes} = await spawnLightningCluster({size});

  const [control, target, remote] = nodes;

  try {
    // Generate some funds for the control
    await control.generate({count});

    // Send starting coins to target and remote
    await sendToChainAddresses({
      lnd: control.lnd,
      send_to: await asyncMap([target, remote], async ({lnd}) => {
        return {
          address: (await createChainAddress({lnd})).address,
          tokens: startingFunds,
        };
      }),
    });

    // Make sure that the nodes have funds
    await asyncRetry({interval, times}, async () => {
      await asyncEach([control, target, remote], async ({lnd}) => {
        await control.generate({});

        if (!(await getChainBalance({lnd})).chain_balance) {
          throw new Error('WaitingForChainBalance');
        }
      });
    });

    // Get UTXOs to spend
    const [controlUtxo] = (await getUtxos({lnd: control.lnd})).utxos.reverse();
    const [targetUtxo] = (await getUtxos({lnd: target.lnd})).utxos;
    const [remoteUtxo] = (await getUtxos({lnd: remote.lnd})).utxos;

    // Make addresses to spend to
    const addresses = await asyncMap(nodes, async ({lnd}) => {
      return await createChainAddress({lnd});
    });

    const [controlAddress, targetAddress, remoteAddress] = addresses;

    // Fund the addresses using the selected UTXOs
    const controlFund = await fundPsbt({
      inputs: [{
        transaction_id: controlUtxo.transaction_id,
        transaction_vout: controlUtxo.transaction_vout,
      }],
      lnd: control.lnd,
      outputs: [{tokens, address: controlAddress.address}],
    });

    const targetFund = await fundPsbt({
      inputs: [{
        transaction_id: targetUtxo.transaction_id,
        transaction_vout: targetUtxo.transaction_vout,
      }],
      lnd: target.lnd,
      outputs: [{tokens, address: targetAddress.address}],
    });

    const remoteFund = await fundPsbt({
      inputs: [{
        transaction_id: remoteUtxo.transaction_id,
        transaction_vout: remoteUtxo.transaction_vout,
      }],
      lnd: remote.lnd,
      outputs: [{tokens, address: remoteAddress.address}],
    });

    // Collect all inputs that are spending
    const inputs = []
      .concat(controlFund.inputs)
      .concat(targetFund.inputs)
      .concat(remoteFund.inputs);

    // Collect all outputs being sent to
    const outputs = []
        .concat(controlFund.outputs)
        .concat(targetFund.outputs)
        .concat(remoteFund.outputs);

    // Make a new PSBT that includes all the outputs and inputs
    const base = createPsbt({
      outputs: outputs.map(output => ({
        script: output.output_script,
        tokens: output.tokens,
      })),
      utxos: inputs.map(input => ({
        id: input.transaction_id,
        vout: input.transaction_vout,
      })),
    });

    // Decode the PSBTs to get signing key details
    const controlDecoded = decodePsbt({ecp, psbt: controlFund.psbt});
    const targetDecoded = decodePsbt({ecp, psbt: targetFund.psbt});
    const remoteDecoded = decodePsbt({ecp, psbt: remoteFund.psbt});

    // Collect all the BIP32 derivations
    const controlBip32Derivations = controlDecoded.inputs
      .map(n => n.bip32_derivations);

    const targetBip32Derivations = targetDecoded.inputs
      .map(n => n.bip32_derivations);

    const remoteBip32Derivations = remoteDecoded.inputs
      .map(n => n.bip32_derivations);

    const controlTransactions = controlDecoded.inputs
      .map(n => n.non_witness_utxo);

    const targetTransactions = targetDecoded.inputs
      .map(n => n.non_witness_utxo);

    const remoteTransactions = remoteDecoded.inputs
      .map(n => n.non_witness_utxo);

    const allDerivations = []
      .concat(controlBip32Derivations)
      .concat(targetBip32Derivations)
      .concat(remoteBip32Derivations);

    const bip32Derivations = flatten(allDerivations);

    // Exit early when derivations are not supported
    if (!!bip32Derivations.filter(n => !n).length) {
      await partiallySignPsbt({lnd: control.lnd, psbt: base.psbt});
    }

    // Update the PSBT so that it has the consolidated details
    const updated = updatePsbt({
      ecp,
      bip32_derivations: bip32Derivations,
      psbt: base.psbt,
      sighashes: inputs.map(input => ({
        id: input.transaction_id,
        sighash: Transaction.SIGHASH_ALL,
        vout: input.transaction_vout,
      })),
      transactions: controlTransactions.concat(targetTransactions),
    });

    await partiallySignPsbt({lnd: control.lnd, psbt: updated.psbt});

    // Sign the PSBT
    const psbts = await asyncMap(nodes, async ({lnd}) => {
      return (await partiallySignPsbt({lnd, psbt: updated.psbt})).psbt;
    });

    // Finalize the signatures
    const finalize = finalizePsbt({
      ecp,
      psbt: combinePsbts({ecp, psbts}).psbt,
    });

    // Pull out the transaction
    const {transaction} = extractTransaction({ecp, psbt: finalize.psbt});

    // Publish the transaction
    await broadcastChainTransaction({lnd: control.lnd, transaction});

    // Make sure that the transaction confirms into a block
    await asyncEach(nodes, async ({lnd}) => {
      return asyncRetry({interval, times}, async () => {
        await control.generate({});

        const {utxos} = await getUtxos({lnd});

        const [confirmed] = utxos.filter(n => n.tokens === tokens);

        if (!confirmed || !confirmed.confirmation_count) {
          throw new Error('ExpectedConfirmedCoin');
        }

        equal(confirmed.tokens, tokens, 'Got confirmed funds');
      });
    });
  } catch (err) {
    deepEqual(err, [501, 'PartiallySignPsbtMethodNotSupported'], 'No Support');
  } finally {
    await kill({});
  }

  return;
});
