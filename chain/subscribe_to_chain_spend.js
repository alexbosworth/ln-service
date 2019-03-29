const EventEmitter = require('events');

const {dummyTxId} = require('./constants');
const scriptFromChainAddress = require('./script_from_chain_address');

/** Subscribe to confirmations of a spend

  A chain address is required or a transaction id and transaction vout, or both

  {
    [bech32_address]: <Address String>
    lnd: <Chain RPC LND gRPC API Object>
    [min_height]: <Minimum Transaction Inclusion Blockchain Height Number>
    [p2pkh_address]: <Address String>
    [p2sh_address]: <Address String>
    [transaction_id]: <Blockchain Transaction Id Hex String>
    [transaction_vout]: <Blockchain Transaction Output Index Number>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @on('confirmation')
  {
    height: <Confirmation Block Height Number>
    transaction: <Raw Transaction Hex String>
    vin: <Spend Outpoint Index Number>
  }

  @on('reorg')
  {
  }
*/
module.exports = args => {
  if (!args.bech32_address && !args.p2sh_address && !args.p2pkh_address) {
    if (!args.transaction_id || args.transaction_vout === undefined) {
      throw new Error('ExpectedChainAddressToSubscribeToSpendConfirmations');
    }
  }

  if (!args.lnd || !args.lnd.registerSpendNtfn) {
    return cbk([400, 'ExpectedLndGrpcApiToSubscribeToSpendConfirmations']);
  }

  const {script} = scriptFromChainAddress({
    bech32_address: args.bech32_address,
    p2pkh_address: args.p2pkh_address,
    p2sh_address: args.p2sh_address,
  });

  if (!script) {
    throw new Error('ExpectedRecognizedAddressFormatToWatchForSpend');
  }

  const eventEmitter = new EventEmitter();

  const subscription = args.lnd.registerSpendNtfn({
    outpoint: {
      hash: Buffer.from(args.transaction_id || dummyTxId, 'hex'),
      index: args.transaction_vout || 0,
    },
    height_hint: args.min_height || 0,
    script: Buffer.from(script, 'hex'),
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

      eventEmitter.emit('reorg', {});
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
