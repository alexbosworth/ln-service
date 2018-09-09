const asyncAuto = require('async/auto');
const {isFinite} = require('lodash');

const getChannel = require('./get_channel');
const {returnResult} = require('./../async-util');

/** Close a channel.

  {
    [id]: <Channel Id String>
    [is_force_close]: <Is Force Close Bool>
    lnd: <LND GRPC API Object>
    [transaction_id]: <Transaction Id Hex String>
    [transaction_vout]: <Transaction Output Index Number>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      const txId = args.transaction_id;
      const vout = args.transaction_vout;

      const isDirectClose = !!txId && vout !== undefined;

      if (!args.id && !isDirectClose) {
        return cbk([400, 'ExpectedIdOfChannelToClose', args]);
      }

      if (!args.lnd) {
        return cbk([400, 'ExpectedLndToExecuteChannelClose']);
      }

      return cbk();
    },

    // Get a single channel
    getChannel: ['validate', ({}, cbk) => {
      if (!args.id) {
        return cbk(null, {
          transaction_id: args.transaction_id,
          transaction_vout: args.transaction_vout,
        });
      }

      return getChannel({id: args.id, lnd: args.lnd}, cbk);
    }],

    // Close out the channel
    closeChannel: ['getChannel', ({getChannel}, cbk) => {
      let transactionId = getChannel.transaction_id;
      let transactionVout = getChannel.transaction_vout;

      const txId = transactionId.match(/.{2}/g).reverse().join('');

      const closeChannel = args.lnd.closeChannel({
        channel_point: {
          funding_txid_bytes: Buffer.from(txId, 'hex'),
          output_index: transactionVout,
        },
        force: !!args.is_force_close,
      });

      closeChannel.on('data', chan => {});

      closeChannel.on('end', () => {});

      closeChannel.on('error', err => {});

      closeChannel.on('status', s => {});

      return cbk();
    }],
  },
  returnResult({}, cbk));
};

