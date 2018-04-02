const asyncAuto = require('async/auto');

const getChainBalance = require('./get_chain_balance');
const {returnResult} = require('./../async-util');

const channelLimit = require('./conf/lnd').channel_limit_tokens;

const staticFee = 1e3;
const minimumChannelSize = 20000;

/** Open a new channel.

  {
    lnd: <LND GRPC API Object>
    partner_public_key: <Public Key String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Get the current chain balance
    getChainBalance: cbk => getChainBalance({lnd: args.lnd}, cbk),

    // Open the channel
    openChannel: ['getChainBalance', ({getChainBalance}, cbk) => {
      const balance = getChainBalance.chain_balance;
      const limit = channelLimit;

      const maxAvailable = balance > limit ? limit : balance;
      const channelAmount = args.local_amt ? args.local_amt : maxAvailable;

      const open = args.lnd.openChannel({
        local_funding_amount: channelAmount - staticFee,
        node_pubkey: Buffer.from(args.partner_public_key, 'hex'),
      });

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

