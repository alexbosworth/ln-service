const {broadcastResponse} = require('./../async-util');

const rowTypes = require('./conf/row_types');

const decBase = 10;
const initialConfirmationCount = 0;

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Chain Address String>
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    lnd: <LND GRPC Object>
    [target_confirmations]: <Confirmations To Wait Number>
    tokens: <Satoshis Number>
    wss: <Web Socket Server Object>
  }

  @returns via cbk
  {
    confirmation_count: <Number>
    id: <Transaction Id String>
    is_confirmed: <Is Confirmed Bool>
    is_outgoing: <Is Outgoing Bool>
    tokens: <Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.address) {
    return cbk([400, 'ExpectedChainAddressToSendTo']);
  }

  if (!args.lnd || !args.lnd.sendCoins) {
    return cbk([400, 'ExpectedLndForChainSendRequest']);
  }

  if (!args.tokens) {
    return cbk([400, 'MissingTokensToSendOnChain']);
  }

  if (!!args.wss && !Array.isArray(args.wss)) {
    return cbk([400, 'ExpectedWssArrayForChainSend']);
  }

  if (!!args.wss && !args.log) {
    return cbk([400, 'ExpectedLogFunctionForChainSendWebSocketAnnouncement']);
  }

  return args.lnd.sendCoins({
    addr: args.address,
    amount: args.tokens,
    sat_per_byte: args.fee_tokens_per_vbyte || undefined,
    target_conf: args.target_confirmations || undefined,
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedSendCoinsError', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResponseFromSendCoinsRequest']);
    }

    if (!res.txid) {
      return cbk([503, 'ExpectedTransactionIdForSendCoinsTransaction', res]);
    }

    const row = {
      confirmation_count: initialConfirmationCount,
      id: res.txid,
      is_confirmed: false,
      is_outgoing: true,
      tokens: parseInt(args.tokens, decBase),
      type: rowTypes.chain_transaction,
    };

    if (!!args.wss) {
      broadcastResponse({row, log: args.log, wss: args.wss});
    }

    return cbk(null, row);
  });
};

