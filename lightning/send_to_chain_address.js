const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');

const initialConfirmationCount = 0;
const lowBalanceErr = 'insufficient funds available to construct transaction';
const unconfirmedConfCount = 0;

/** Send tokens in a blockchain transaction.

  Requires `onchain:write` permission

  `description` is not supported on LND 0.10.4 or below

  `utxo_confirmations` is not supported on LND 0.11.1 or below

  {
    address: <Destination Chain Address String>
    [description]: <Transaction Label String>
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    [is_send_all]: <Send All Funds Bool>
    lnd: <Authenticated LND API Object>
    [log]: <Log Function>
    [target_confirmations]: <Confirmations To Wait Number>
    tokens: <Tokens To Send Number>
    [utxo_confirmations]: <Minimum Confirmations for UTXO Selection Number>
    [wss]: [<Web Socket Server Object>]
  }

  @returns via cbk or Promise
  {
    confirmation_count: <Total Confirmations Number>
    id: <Transaction Id Hex String>
    is_confirmed: <Transaction Is Confirmed Bool>
    is_outgoing: <Transaction Is Outgoing Bool>
    tokens: <Transaction Tokens Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
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
          return cbk([400, 'ExpectedLogFunctionForChainSendSocketAnnounce']);
        }

        return cbk();
      },

      // Send coins
      send: ['validate', ({}, cbk) => {
        return args.lnd.default.sendCoins({
          addr: args.address,
          amount: args.tokens || undefined,
          min_confs: args.utxo_confirmations || undefined,
          label: args.description || undefined,
          sat_per_byte: args.fee_tokens_per_vbyte || undefined,
          send_all: args.is_send_all || undefined,
          spend_unconfirmed: args.utxo_confirmations === unconfirmedConfCount,
          target_conf: args.target_confirmations || undefined,
        },
        (err, res) => {
          if (!!err && err.details === lowBalanceErr) {
            return cbk([503, 'InsufficientBalanceToSendToChainAddress']);
          }

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
            tokens: Number(args.tokens),
          };

          if (!!args.wss) {
            broadcastResponse({row, log: args.log, wss: args.wss});
          }

          return cbk(null, row);
        });
      }],
    },
    returnResult({reject, resolve, of: 'send'}, cbk));
  });
};
