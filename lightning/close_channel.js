const asyncAuto = require('async/auto');
const {isFinite} = require('lodash');

const {returnResult} = require('./../async-util');

const intBase = 10;
const separatorChar = ':';

/** Close a channel.

  {
    id: <Channel Id String>
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {}
*/
module.exports = ({id, lnd}, cbk) => {
  return asyncAuto({
    validate: cbk => {
      if (!lnd) {
        return cbk([500, 'ExpectedLnd']);
      }

      return cbk();
    },

    getChannel: cbk => {
      if (!id) {
        return cbk([400, 'ExpectedChannelId']);
      }

      return lnd.getChanInfo({chan_id: id}, (err, response) => {
        if (!!err) {
          return cbk([503, 'GetChanErr', err]);
        }

        if (!response) {
          return cbk([503, 'ExpectedResponse']);
        }

        if (!response.chan_point) {
          return cbk([503, 'ExpectedOutpoint']);
        }

        const [transactionId, vout] = response.chan_point.split(separatorChar);

        if (!transactionId) {
          return cbk([503, 'ExpectedTransactionId']);
        }

        if (!isFinite(parseInt(vout, intBase))) {
          return cbk([503, 'ExpectedVout']);
        }

        return cbk(null, {
          transaction_id: transactionId,
          transaction_vout: parseInt(vout, intBase),
        });
      });
    },

    closeChannel: ['getChannel', ({getChannel}, cbk) => {
      let transactionId = getChannel.transaction_id;
      let transactionVout = getChannel.transaction_vout;

      // FIXME: - make this use the stream API properly

      const txId = transactionId.match(/.{2}/g).reverse().join('');

      const closeChannel = lnd.closeChannel({
        channel_point: {
          funding_txid: Buffer.from(txId, 'hex'),
          output_index: transactionVout,
        },
      });

      closeChannel.on('data', chan => {
        if (chan.update === 'close_pending') {
          const txId = chan.close_pending.txid.toString('hex');

          console.log({
            transaction_id: txId.match(/.{2}/g).reverse().join(''),
            type: 'channel_closing',
            vout: chan.close_pending.output_index,
          });
        } else {
          console.log('CLOSE CHAN', chan);
        }
      });

      closeChannel.on('end', () => {
        return console.log('END CLOSE CHANNEL');
      });

      closeChannel.on('error', err => {
        return console.log('CLOSE CHAN ERR', err);
      });

      closeChannel.on('status', s => { console.log('CLOSING', s); });

      return cbk();
    }],
  },
  returnResult({}, cbk));
};

