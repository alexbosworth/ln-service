const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');
const {Transaction} = require('bitcoinjs-lib');

const getPublicKey = require('./get_public_key');

/** Get an RPC funding shim for external channel funding

  Requires LND compiled with `walletrpc` build tag

  {
    id: <Pending Channel Id Hex String>
    key_family: <Funding Key HD Family Number>
    key_index: <Funding Key HD Index Number>
    lnd: <Authenticated LND gRPC API Object>
    partner_key: <Partner Multisig Public Key Hex String>
    transaction: <Funding Transaction Hex String>
    vout: <Funding Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
    amt: <Tokens Amount String>
    chan_point: {
      funding_txid_bytes: <Funding Transaction Id Buffer>
      output_index: <Output Index Number>
    },
    local_key: {
      raw_key_bytes: <Local Funding Output Key Bytes Buffer>
      key_loc: {
        key_family: <Local Key Family Number>
        key_index: <Local Key Index Number>
      }
    },
    remote_key: <Remote Funding Public Key Buffer>
    pending_chan_id: <Pending Channel Id Buffer>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.id) {
          return cbk([400, 'ExpectedPendingChannelIdToGetFundingShim']);
        }

        if (args.key_family === undefined) {
          return cbk([400, 'ExpectedKeyFamilyToGetFundingShim']);
        }

        if (args.key_index === undefined) {
          return cbk([400, 'ExpectedKeyIndexToGetFundingShim']);
        }

        if (!args.lnd) {
          return cbk([400, 'ExpectedLndToGetFundingShim']);
        }

        if (!args.partner_key) {
          return cbk([400, 'ExpectedPartnerKeyToGetFundingShim']);
        }

        try {
          Transaction.fromHex(args.transaction);
        } catch (err) {
          return cbk([400, 'ExpectedValidTransactionToGetFundingShim']);
        }

        if (args.vout === undefined) {
          return cbk([400, 'ExpectedTransactionOutputIndexToGetFundingShim']);
        }

        return cbk();
      },

      // Funding amount tokens
      amount: ['validate', ({}, cbk) => {
        const output = Transaction.fromHex(args.transaction).outs[args.vout];

        if (!output) {
          return cbk([400, 'NoOutputFoundAtSpecifiedVoutForFundingShim']);
        }

        return cbk(null, output.value);
      }],

      // Get the local key bytes
      getLocalKey: ['validate', ({}, cbk) => {
        return getPublicKey({
          family: args.key_family,
          index: args.key_index,
          lnd: args.lnd,
        },
        cbk);
      }],

      // Translate external funding details into a funding shim
      shim: ['amount', 'getLocalKey', ({amount, getLocalKey}, cbk) => {
        const transactionId = Transaction.fromHex(args.transaction).getId();

        return cbk(null, {
          amt: amount.toString(),
          chan_point: {
            funding_txid_bytes: Buffer.from(transactionId, 'hex'),
            output_index: args.vout,
          },
          local_key: {
            raw_key_bytes: Buffer.from(getLocalKey.public_key, 'hex'),
            key_loc: {
              key_family: args.key_family,
              key_index: args.key_index,
            },
          },
          remote_key: Buffer.from(args.partner_key, 'hex'),
          pending_chan_id: args.id,
        });
      }],
    },
    returnResult({reject, resolve, of: 'shim'}, cbk));
  });
};
