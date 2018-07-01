const asyncAuto = require('async/auto');

const getChainBalance = require('./get_chain_balance');
const {returnResult} = require('./../async-util');

const channelLimit = require('./conf/lnd').channel_limit_tokens;

const staticFee = 1e3;
const minimumChannelSize = 20000;

/** Open a new channel.

  {
    [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
    [give_tokens]: <Tokens to Give To Partner Number>
    lnd: <LND GRPC API Object>
    [local_tokens]: <Local Tokens Number> // When not set, uses max possible
    partner_public_key: <Public Key Hex String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.lnd) {
        return cbk([400, 'ExpectedLnd']);
      }

      if (!args.partner_public_key) {
        return cbk([400, 'ExpectedPartnerPublicKey']);
      }

      if (args.local_tokens < minimumChannelSize) {
        return cbk([400, 'ExpectedLargerChannelSize']);
      }

      if (args.local_tokens > channelLimit) {
        return cbk([400, 'ChannelSizeExceedsChannelLimit']);
      }

      return cbk();
    },

    // Get the current chain balance
    getChainBalance: cbk => getChainBalance({lnd: args.lnd}, cbk),

    // Open the channel
    openChannel: ['getChainBalance', 'validate', ({getChainBalance}, cbk) => {
      const balance = getChainBalance.chain_balance;
      const limit = channelLimit;

      const maxTokens = balance > limit ? limit : balance;

      const channelAmount = args.local_tokens ? args.local_tokens : maxTokens;

      const options = {
        local_funding_amount: channelAmount - staticFee,
        node_pubkey: Buffer.from(args.partner_public_key, 'hex'),
      }

      if (!!args.chain_fee_tokens_per_vbyte) {
        options.sat_per_byte = chain_fee_tokens_per_vbyte;
      }

      if (!!args.give_tokens) {
        options.push_sat = args.give_tokens;
      }

      const open = args.lnd.openChannel(options);

      open.on('data', chan => {
        switch (chan.update) {
        case 'chan_open':
          const chanOpenTxId = chan.chan_open.channel_point.funding_txid
            .toString('hex').match(/.{2}/g).reverse().join('');

          console.log({
            transaction_id: chanOpenTxId,
            type: 'channel_open',
            vout: chan.chan_open.channel_point.output_index,
          });
          break;

        case 'chan_pending':
          const chanPendingTxId = chan.chan_pending.txid.toString('hex')
            .match(/.{2}/g).reverse().join('')

          console.log({
            transaction_id: chanPendingTxId,
            type: 'channel_pending',
            vout: chan.chan_pending.output_index,
          });
          break;

        default:
          console.log('CHANNEL UPDATE', chan);
          break;
        }
      });

      open.on('end', () => console.log("END OPEN CHANNEL SEND"));
      open.on('error', err => console.log("OPEN CHANNEL ERROR", err));
      open.on('status', n => console.log("OPEN CHANNEL STATUS", n));

      return cbk();
    }],
  },
  returnResult({}, cbk));
};

