const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {includes} = require('lodash');

const {returnResult} = require('./../async-util');
const rowTypes = require('./conf/row_types');

const decBase = 10;

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    pending_channels: [{
      [close_transaction_id]: <Channel Closing Transaction Id String>
      is_active: <Channel Is Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      local_balance: <Channel Local Tokens Balance Number>
      partner_public_key: <Channel Peer Public Key String>
      [pending_tokens]: <Tokens Pending Recovery Number>
      received: <Tokens Received Number>
      [recovered_tokens]: <Tokens Recovered From Close Number>
      remote_balance: <Remote Tokens Balance Number>
      sent: <Send Tokens Number>
      [timelock_expiration]: <Pending Tokens Block Height Timelock Number>
      transaction_id: <Channel Funding Transaction Id String>
      transaction_vout: <Channel Funding Transaction Vout Number>
      type: <Row Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd || !lnd.pendingChannels) {
    return cbk([400, 'ExpectedLndForPendingChannelsRequest']);
  }

  return asyncAuto({
    getPending: cbk => {
      return lnd.pendingChannels({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'PendingChannelsErr', err]);
        }

        if (!res || !Array.isArray(res.pending_open_channels)) {
          return cbk([503, 'ExpectedPendingOpenChannels', res]);
        }

        if (!res || !Array.isArray(res.pending_closing_channels)) {
          return cbk([503, 'ExpectedPendingClosingChannels', res]);
        }

        if (!res || !Array.isArray(res.pending_force_closing_channels)) {
          return cbk([503, 'ExpectedPendingForceCloseChannels', res]);
        }

        const opening = res.pending_open_channels.map(n => {
          return n.channel.channel_point;
        });

        const forceClosing = {};

        res.pending_force_closing_channels.forEach(n => {
          return forceClosing[n.channel.channel_point] = {
            close_transaction_id: n.closing_txid,
            pending_payments: n.pending_htlcs,
            pending_tokens: parseInt(n.limbo_balance, decBase),
            recovered_tokens: parseInt(n.recovered_balance, decBase),
            timelock_expiration: n.maturity_height,
          };
        });

        const channels = []
          .concat(res.pending_open_channels)
          .concat(res.pending_closing_channels)
          .concat(res.pending_force_closing_channels)
          .concat(res.waiting_close_channels)
          .map(n => n.channel);

        return cbk(null, {channels, forceClosing, opening});
      });
    },

    pendingChannels: ['getPending', ({getPending}, cbk) => {
      const openingOutpoints = getPending.opening;
      const {forceClosing} = getPending;

      return asyncMap(getPending.channels, (channel, cbk) => {
        if (!channel.channel_point) {
          return cbk([503, 'ExpectedChannelOutpoint', channel]);
        }

        const forceClose = forceClosing[channel.channel_point] || {};
        const isOpening = includes(openingOutpoints, channel.channel_point);
        const [transactionId, vout] = channel.channel_point.split(':');

        if (channel.local_balance === undefined) {
          return cbk([503, 'ExpectedLocalBalance', channel]);
        }

        if (!channel.remote_node_pub) {
          return cbk([503, 'ExpectedRemoteNodePub', channel]);
        }

        if (channel.remote_balance === undefined) {
          return cbk([503, 'ExpectedRemoteBalance', channel]);
        }

        return cbk(null, {
          close_transaction_id: forceClose.close_transaction_id || undefined,
          is_active: false,
          is_closing: !isOpening,
          is_opening: isOpening,
          local_balance: parseInt(channel.local_balance, decBase),
          partner_public_key: channel.remote_node_pub,
          pending_tokens: forceClose.pending_tokens || undefined,
          received: 0,
          recovered_tokens: forceClose.recovered_tokens || undefined,
          remote_balance: parseInt(channel.remote_balance, decBase),
          sent: 0,
          timelock_expiration: forceClose.timelock_expiration || undefined,
          transaction_id: transactionId,
          transaction_vout: parseInt(vout, decBase),
          type: rowTypes.channel,
        });
      },
      cbk);
    }],

    pending: ['pendingChannels', ({pendingChannels}, cbk) => {
      return cbk(null, {pending_channels: pendingChannels});
    }],
  },
  returnResult({of: 'pending'}, cbk));
};

