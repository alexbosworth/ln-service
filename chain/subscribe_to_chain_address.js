const EventEmitter = require('events');

const scriptFromChainAddress = require('./script_from_chain_address');
const {dummyTxId} = require('./constants');

/** Subscribe to confirmation details about transactions sent to an address

  One and only one chain address or output script is required

  {
    [bech32_address]: <Address String>
    lnd: <Chain RPC LND gRPC API Object>
    [min_confirmations]: <Minimum Confirmations Number>
    [min_height]: <Minimum Transaction Inclusion Blockchain Height Number>
    [output_script]: <Output Script Hex String>
    [p2pkh_address]: <Address String>
    [p2sh_address]: <Address String>
    [transaction_id]: <Blockchain Transaction Id String>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @on('confirmation')
  {
    block: <Block Hash Hex String>
    height: <Block Best Chain Height Number>
    transaction: <Raw Transaction Hex String>
  }

  @on('reorg')
  {
  }
*/
module.exports = args => {
  let outputScript = args.output_script;

  if (!args.output_script) {
    if (!args.bech32_address && !args.p2sh_address && !args.p2pkh_address) {
      throw new Error('ExpectedChainAddressToSubscribeForConfirmationEvents');
    }

    const {script} = scriptFromChainAddress({
      bech32_address: args.bech32_address,
      p2pkh_address: args.p2pkh_address,
      p2sh_address: args.p2sh_address,
    });

    if (!script) {
      throw new Error('ExpectedRecognizedAddressFormatToWatchForScript');
    }

    outputScript = script;
  }

  if (!args.lnd || !args.lnd.chain) {
    throw new Error('ExpectedLndGrpcApiToSubscribeToChainTransaction');
  }

  const eventEmitter = new EventEmitter();

  const sub = args.lnd.chain.registerConfirmationsNtfn({
    height_hint: args.min_height || 0,
    num_confs: args.min_confirmations || 1,
    script: Buffer.from(outputScript, 'hex'),
    txid: Buffer.from(args.transaction_id || dummyTxId, 'hex'),
  });

  sub.on('end', () => eventEmitter.emit('end'));
  sub.on('status', n => eventEmitter.emit('status', n));

  sub.on('error', err => {
    eventEmitter.emit('error', new Error('UnexpectedErrInTxSubscription'));

    return;
  });

  sub.on('data', data => {
    if (!data) {
      return eventEmitter.emit('error', new Error('ExpectedDataForConfEvent'));
    }

    switch (!!data.conf) {
    case false:
      if (!data.reorg) {
        eventEmitter.emit('error', new Error('ExpectedTransactionReorgEvent'));
        break;
      }

      eventEmitter.emit('reorg', {});
      break;

    case true:
      if (!Buffer.isBuffer(data.conf.block_hash)) {
        eventEmitter.emit('error', new Error('ExpectedConfirmationBlockHash'));
        break;
      }

      if (!data.conf.block_height) {
        eventEmitter.emit('error', new Error('ExpectedConfirmationHeight'));
        break;
      }

      if (!Buffer.isBuffer(data.conf.raw_tx)) {
        eventEmitter.emit('error', new Error('ExpectedRawTxInAddressConf'));
        break;
      }

      eventEmitter.emit('confirmation', {
        block: data.conf.block_hash.toString('hex'),
        height: data.conf.block_height,
        transaction: data.conf.raw_tx.toString('hex'),
      });
      break;
    }

    return;
  });

  return eventEmitter;
};
