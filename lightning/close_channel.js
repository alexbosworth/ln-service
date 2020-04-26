const {addPeer} = require('lightning/lnd_methods');
const asyncAuto = require('async/auto');
const {chanNumber} = require('bolt07');
const {getChannel} = require('lightning/lnd_methods');
const {returnResult} = require('asyncjs-util');

/** Close a channel.

  Either an id or a transaction id / transaction output index is required

  If cooperatively closing, pass a public key and socket to connect

  Requires info:read, offchain:write, onchain:write, peers:write permissions

  `address` is not supported in LND v0.8.2 and below

  {
    [address]: <Request Sending Local Channel Funds To Address String>
    [id]: <Standard Format Channel Id String>
    [is_force_close]: <Is Force Close Bool>
    lnd: <Authenticated LND API Object>
    [public_key]: <Peer Public Key String>
    [socket]: <Peer Socket String>
    [target_confirmations]: <Confirmation Target Number>
    [tokens_per_vbyte]: <Tokens Per Virtual Byte Number>
    [transaction_id]: <Transaction Id Hex String>
    [transaction_vout]: <Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
    transaction_id: <Closing Transaction Id Hex String>
    transaction_vout: <Closing Transaction Vout Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        const targetConfs = args.target_confirmations;
        const txId = args.transaction_id;
        const vout = args.transaction_vout;

        const isDirectClose = !!txId && vout !== undefined;

        if (!!args.address && !!args.is_force_close) {
          return cbk([400, 'ExpectedCoopCloseWhenCloseAddressSpecified']);
        }

        if (!args.id && !isDirectClose) {
          return cbk([400, 'ExpectedIdOfChannelToClose']);
        }

        if (!args.lnd || !args.lnd.default || !args.lnd.default.closeChannel) {
          return cbk([400, 'ExpectedLndToExecuteChannelClose']);
        }

        if (!!args.public_key !== !!args.socket) {
          return cbk([400, 'ExpectedBothPublicKeyAndSocketForChannelClose']);
        }

        if (!!targetConfs && args.tokens_per_vbyte !== undefined) {
          return cbk([400, 'UnexpectedTokensPerVbyteForChannelClose']);
        }

        if (!!args.is_force_close && args.tokens_per_vbyte !== undefined) {
          return cbk([400, 'UnexpectedFeeSettingForForceCloseChannel']);
        }

        return cbk();
      },

      // Add peer
      addPeer: ['validate', ({}, cbk) => {
        // Exit early and avoid adding peer when force close, unknown peer key
        if (!!args.is_force_close || !args.public_key) {
          return cbk();
        }

        return addPeer({
          lnd: args.lnd,
          public_key: args.public_key,
          socket: args.socket,
        },
        cbk);
      }],

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
      closeChannel: ['addPeer', 'getChannel', ({getChannel}, cbk) => {
        let isFinished = false;
        const tokensPerVByte = args.tokens_per_vbyte;
        const transactionId = Buffer.from(getChannel.transaction_id, 'hex');
        const transactionVout = getChannel.transaction_vout;

        const closeChannel = args.lnd.default.closeChannel({
          channel_point: {
            funding_txid_bytes: transactionId.reverse(),
            output_index: transactionVout,
          },
          delivery_address: args.address || undefined,
          force: !!args.is_force_close,
          sat_per_byte: !!tokensPerVByte ? tokensPerVByte : undefined,
          target_conf: args.target_confirmations || undefined,
        });

        const finished = (err, res) => {
          if (!!isFinished) {
            return;
          }

          closeChannel.cancel();

          isFinished = true;

          return cbk(err, res);
        };

        closeChannel.on('data', chan => {
          switch (chan.update) {
          case 'chan_close':
            break;

          case 'close_pending':
            if (!chan.close_pending) {
              return finished([503, 'ExpectedClosePendingData']);
            }

            if (!chan.close_pending.txid) {
              return finished([503, 'ExpectedClosePendingTransactionId']);
            }

            if (chan.close_pending.output_index === undefined) {
              return finished([503, 'ExpectedOutputIndexForPendingChanClose']);
            }

            const closeTxId = chan.close_pending.txid.reverse();

            return finished(null, {
              transaction_id: closeTxId.toString('hex'),
              transaction_vout: chan.close_pending.output_index,
            });
            break;

          case 'confirmation':
            break;

          default:
            break;
          }
        });

        closeChannel.on('end', () => {});

        closeChannel.on('error', err => {
          return finished([503, 'UnexpectedCloseChannelError', {err}]);
        });

        closeChannel.on('status', () => {});

        return;
      }],
    },
    returnResult({reject, resolve, of: 'closeChannel'}, cbk));
  });
};
