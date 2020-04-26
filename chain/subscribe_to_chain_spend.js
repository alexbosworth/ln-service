const EventEmitter = require('events');

const {dummyTxId} = require('./constants');
const scriptFromChainAddress = require('./script_from_chain_address');

/** Subscribe to confirmations of a spend

  A chain address or raw output script is required

  Requires LND built with `chainrpc` build tag

  Requires `onchain:read` permission

  {
    [bech32_address]: <Bech32 P2WPKH or P2WSH Address String>
    lnd: <Authenticated LND API Object>
    min_height: <Minimum Transaction Inclusion Blockchain Height Number>
    [output_script]: <Output Script AKA ScriptPub Hex String>
    [p2pkh_address]: <Pay to Public Key Hash Address String>
    [p2sh_address]: <Pay to Script Hash Address String>
    [transaction_id]: <Blockchain Transaction Id Hex String>
    [transaction_vout]: <Blockchain Transaction Output Index Number>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'confirmation'
  {
    height: <Confirmation Block Height Number>
    transaction: <Raw Transaction Hex String>
    vin: <Spend Outpoint Index Number>
  }

  @event 'reorg'
*/
module.exports = args => {
  if (!args.lnd || !args.lnd.chain || !args.lnd.chain.registerSpendNtfn) {
    throw new Error('ExpectedLndGrpcApiToSubscribeToSpendConfirmations');
  }

  if (!args.min_height) {
    throw new Error('ExpectedMinHeightToSubscribeToChainSpend');
  }

  const {script} = scriptFromChainAddress({
    bech32_address: args.bech32_address,
    p2pkh_address: args.p2pkh_address,
    p2sh_address: args.p2sh_address,
  });

  if (!script && !args.output_script) {
    throw new Error('ExpectedRecognizedAddressFormatToWatchForSpend');
  }

  const eventEmitter = new EventEmitter();

  const subscription = args.lnd.chain.registerSpendNtfn({
    outpoint: {
      hash: Buffer.from(args.transaction_id || dummyTxId, 'hex').reverse(),
      index: args.transaction_vout || 0,
    },
    height_hint: args.min_height || 0,
    script: Buffer.from(script || args.output_script, 'hex'),
  });

  subscription.on('end', () => eventEmitter.emit('end'));
  subscription.on('status', n => eventEmitter.emit('status', n));

  subscription.on('error', err => {
    eventEmitter.emit('error', new Error('UnexpectedErrInSpendSubscription'));

    return;
  });

  subscription.on('data', data => {
    if (!data) {
      return eventEmitter.emit('error', new Error('ExpectedSpendConfEvent'));
    }

    switch (!!data.spend) {
    case false:
      if (!data.reorg) {
        eventEmitter.emit('error', new Error('ExpectedSpendTxReorgEvent'));
        break;
      }

      eventEmitter.emit('reorg');
      break;

    case true:
      if (!Buffer.isBuffer(data.spend.raw_spending_tx)) {
        eventEmitter.emit('error', new Error('ExpectedRawTxInSpendConf'));
        break;
      }

      if (data.spend.spending_height === undefined) {
        eventEmitter.emit('error', new Error('ExpectedHeightInSpendConf'));
        break;
      }

      if (data.spend.spending_input_index === undefined) {
        eventEmitter.emit('error', new Error('ExpectedVinInSpendConf'));
        break;
      }

      eventEmitter.emit('confirmation', {
        height: data.spend.spending_height,
        transaction: data.spend.raw_spending_tx.toString('hex'),
        vin: data.spend.spending_input_index,
      });
      break;
    }

    return;
  });

  return eventEmitter;
};
