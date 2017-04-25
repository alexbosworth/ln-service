const asyncAuto = require('async/auto');

const getChainBalance = require('./get_chain_balance');

const staticFee = 1e5;

/** Open a new channel.

  {
    lnd_grpc_api: <LND GRPC API Object>
    partner_public_key: <Public Key String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    getChainBalance: (cbk) => {
      return getChainBalance({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    openChannel: ['getChainBalance', (res, cbk) => {
      // FIXME: - cleanup and make work properly

      console.log('OPENING CHANNEL', res.getChainBalance);

      const open = args.lnd_grpc_api.openChannel({
        local_funding_amount: res.getChainBalance - staticFee,
        node_pubkey: Buffer.from(args.partner_public_key, 'hex'),
        num_confs: 1,
      });

      open.on('data', function(chan) {
        if (chan.update === 'chan_open') {
          const transactionId = chan.chan_open.channel_point.funding_txid
            .toString('hex').match(/.{2}/g).reverse().join('')

          console.log({
            transaction_id: transactionId,
            type: 'channel_open',
            vout: chan.chan_open.channel_point.output_index,
          });
        } else if (chan.update === 'chan_pending') {
          const transactionId = chan.chan_pending.txid.toString('hex')
            .match(/.{2}/g).reverse().join('')

          console.log({
            transaction_id: transactionId,
            type: 'channel_pending',
            vout: chan.chan_pending.output_index,
          });
        } else {
          console.log('CHANNEL UPDATE', chan);
        }
      });

      open.on('end', function() {
        console.log("END OPEN CHANNEL SEND");
      });

      open.on('status', function(status) {
        console.log("OPEN CHANNEL STATUS", status);
      });

      open.on('error', (error) => {
        console.log("OPEN CHANNEL ERROR", error);
      });

      return cbk();
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk();
  });
};

