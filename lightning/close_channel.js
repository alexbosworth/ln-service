const asyncAuto = require('async/auto');
const {isFinite} = require('lodash');

const getChannel = require('./get_channel');
const {returnResult} = require('./../async-util');

/** Close a channel.

  Either an id or a transaction id / transaction output index is required

  {
    [id]: <Channel Id String>
    [is_force_close]: <Is Force Close Bool>
    lnd: <LND GRPC API Object>
    [target_confirmations]: <Confirmation Target Number>
    [tokens_per_vbyte]: <Tokens Per Virtual Byte Number>
    [transaction_id]: <Transaction Id Hex String>
    [transaction_vout]: <Transaction Output Index Number>
  }

  @returns via cbk
  {
    transaction_id: <Closing Transaction Id Hex String>
    type: <Row Type String>
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

      if (!!args.target_confirmations && args.tokens_per_vbyte !== undefined) {
        return cbk([400, 'UnexpectedTokensPerVbyteForChannelClose']);
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
      let isAnnounced = false;
      const tokensPerVByte = args.tokens_per_vbyte;
      const transactionId = Buffer.from(getChannel.transaction_id, 'hex');
      const transactionVout = getChannel.transaction_vout;

      const closeChannel = args.lnd.closeChannel({
        channel_point: {
          funding_txid_bytes: transactionId.reverse(),
          output_index: transactionVout,
        },
        force: !!args.is_force_close,
        sat_per_byte: !!tokensPerVByte ? tokensPerVByte : undefined,
        target_conf: args.target_confirmations || undefined,
      });

      closeChannel.on('data', chan => {
        switch (chan.update) {
        case 'chan_close':
          if (isAnnounced) {
            break;
          }

          isAnnounced = true;

          if (!chan.chan_close || !chan.chan_close.closing_txid) {
            return cbk([503, 'UnexpectedChanClose'])
          }

          const closingTransactionId = chan.chan_close.closing_txid.reverse();

          return cbk(null, {
            transaction_id: closingTransactionId.toString('hex'),
            type: 'pending_close_channel',
          })
          break;

        case 'close_pending':
          break;

        case 'confirmation':
          break;

        default:
          break;
        }
      });

      closeChannel.on('end', () => {});

      closeChannel.on('error', err => {});

      closeChannel.on('status', n => {
        if (isAnnounced) {
          return;
        }

        isAnnounced = true;

        if (!n || !n.details) {
          return cbk([503, 'UnknownChannelOpenStatus']);
        }

        switch (n.details) {
        default:
          return cbk([503, 'FailedToCloseChannel', n]);
        }
      });

      return cbk();
    }],
  },
  returnResult({}, cbk));
};

