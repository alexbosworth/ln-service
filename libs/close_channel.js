const asyncAuto = require('async/auto');

/** Close a channel.

  {
    id: <Channel Id String>
    lnd_grpc_api: <LND GRPC API Object>
  }

  @returns via cbk
  {}
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return asyncAuto({
    getChannel: (cbk) => {
      if (!args.id) { return cbk([400, 'Expected channel id']); }

      return args.lnd_grpc_api.getChanInfo({
        chan_id: args.id,
      },
      (err, response) => {
        if (!!err) { return cbk([500, 'Get chan err', err]); }

        if (!response) { return cbk([500, 'Expected response']); }

        if (!response.chan_point) { return cbk([500, 'Expected outpoint']); }

        const [transactionId, vout] = response.chan_point.split(':');

        if (!transactionId) { return cbk([500, 'Expected transaction id']); }

        if (vout === undefined) { return cbk([500, 'Expected vout']); }

        return cbk(null, {
          transaction_id: transactionId,
          transaction_vout: parseInt(vout),
        });
      });
    },

    closeChannel: ['getChannel', (res, cbk) => {
      let transactionId = res.getChannel.transaction_id;
      let transactionVout = res.getChannel.transaction_vout;

      // FIXME: - make this use the stream API properly

      const closeChannel = args.lnd_grpc_api.closeChannel({
        channel_point: {
          funding_txid: Buffer.from(transactionId.match(/.{2}/g).reverse().join(''), 'hex'),
          output_index: transactionVout,
        },
        force: true,
      });

      closeChannel.on('data', (chan) => {
        if (chan.update === 'close_pending') {
          console.log('TX ID', chan.close_pending.txid);

          console.log({
            transaction_id: chan.close_pending.txid.toString('hex'),
            type: 'channel_closing',
            vout: chan.close_pending.output_index,
          });
        } else {
          console.log('CLOSE CHAN', chan);
        }
      });

      closeChannel.on('end', () => { console.log('END CLOSE CHANNEL'); });

      closeChannel.on('error', (err) => { console.log('CLOSE CHAN ERR', err); });

      closeChannel.on('status', (status) => { console.log('CHSTA', status); });

      return cbk();
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk();
  });
};

