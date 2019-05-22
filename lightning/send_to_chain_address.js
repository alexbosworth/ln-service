const {broadcastResponse} = require('./../async-util');

const rowTypes = require('./conf/row_types');

const decBase = 10;
const initialConfirmationCount = 0;

/** Send tokens in a blockchain transaction.

  {
    address: <Destination Chain Address String>
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    [is_send_all]: <Send All Funds Bool>
    lnd: <Authenticated LND gRPC API Object>
    [log]: <Log Function>
    [target_confirmations]: <Confirmations To Wait Number>
    tokens: <Tokens To Send Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk
  {
    confirmation_count: <Total Confirmations Number>
    id: <Transaction Id Hex String>
    is_confirmed: <Transaction Is Confirmed Bool>
    is_outgoing: <Transaction Is Outgoing Bool>
    tokens: <Transaction Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.address) {
    return cbk([400, 'ExpectedChainAddressToSendTo']);
  }

  if (!args.lnd || !args.lnd.default || !args.lnd.default.sendCoins) {
    return cbk([400, 'ExpectedLndForChainSendRequest']);
  }

  if (!args.tokens && !args.is_send_all) {
    return cbk([400, 'MissingTokensToSendOnChain']);
  }

  if (!!args.tokens && !!args.is_send_all) {
    return cbk([400, 'ExpectedNoTokensSpecifiedWhenSendingAllFunds']);
  }

  if (!!args.wss && !Array.isArray(args.wss)) {
    return cbk([400, 'ExpectedWssArrayForChainSend']);
  }

  if (!!args.wss && !args.log) {
    return cbk([400, 'ExpectedLogFunctionForChainSendWebSocketAnnouncement']);
  }

  return args.lnd.default.sendCoins({
    addr: args.address,
    amount: args.tokens || undefined,
    sat_per_byte: args.fee_tokens_per_vbyte || undefined,
    send_all: args.is_send_all || undefined,
    target_conf: args.target_confirmations || undefined,
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedSendCoinsError', {err}]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResponseFromSendCoinsRequest']);
    }

    if (!res.txid) {
      return cbk([503, 'ExpectedTransactionIdForSendCoinsTransaction']);
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
