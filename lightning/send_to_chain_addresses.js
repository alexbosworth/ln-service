const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {broadcastResponse} = require('./../push');

const initialConfirmationCount = 0;
const {isArray} = Array;

/** Send tokens to multiple destinations in a blockchain transaction.

  Requires `onchain:write` permission

  `description` is not supported in LND 0.10.4 and below

  {
    [description]: <Transaction Label String>
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    lnd: <Authenticated LND API Object>
    [log]: <Log Function>
    send_to: [{
      address: <Address String>
      tokens: <Tokens Number>
    }]
    [target_confirmations]: <Confirmations To Wait Number>
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
        if (!args.lnd || !args.lnd.default) {
          return cbk([400, 'ExpectedLndToSendToChainAddresses']);
        }

        if (!isArray(args.send_to) || !args.send_to.length) {
          return cbk([400, 'ExpectedSendToAddressesAndTokens']);
        }

        if (args.send_to.find(({address, tokens}) => !address || !tokens)) {
          return cbk([400, 'ExpectedAddrsAndTokensWhenSendingToAddresses']);
        }

        if (!!args.wss && !isArray(args.wss)) {
          return cbk([400, 'ExpectedWssArrayForSendToChainAddresses']);
        }

        if (!!args.wss && !args.log) {
          return cbk([400, 'ExpectedLogForChainSendWebSocketAnnouncement']);
        }

        return cbk();
      },

      send: ['validate', ({}, cbk) => {
        const AddrToAmount = {};

        args.send_to
          .forEach(({address, tokens}) => AddrToAmount[address] = tokens);

        const send = {
          AddrToAmount,
          label: args.description || undefined,
          sat_per_byte: args.fee_tokens_per_vbyte || undefined,
          target_conf: args.target_confirmations || undefined,
        };

        return args.lnd.default.sendMany(send, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedSendManyError', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseFromSendManyRequest']);
          }

          if (!res.txid) {
            return cbk([503, 'ExpectedTxIdForSendManyTransaction', res]);
          }

          const row = {
            confirmation_count: initialConfirmationCount,
            id: res.txid,
            is_confirmed: false,
            is_outgoing: true,
            tokens: args.send_to.reduce((sum, n) => sum + n.tokens, 0),
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
