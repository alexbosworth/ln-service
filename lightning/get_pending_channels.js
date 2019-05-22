const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {includes} = require('lodash');

const {returnResult} = require('./../async-util');
const rowTypes = require('./conf/row_types');

const decBase = 10;
const {isArray} = Array;
const outpointSeparator = ':';

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  {
    lnd: <Authenticated LND gRPC API Object>
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
      [pending_balance]: <Tokens Pending Recovery Number>
      [pending_payments]: [{
        is_incoming: <Payment Is Incoming Bool>
        timelock_height: <Payment Timelocked Until Height Number>
        tokens: <Payment Tokens Number>
        transaction_id: <Payment Transaction Id String>
        transaction_vout: <Payment Transaction Vout Number>
      }]
      received: <Tokens Received Number>
      [recovered_tokens]: <Tokens Recovered From Close Number>
      remote_balance: <Remote Tokens Balance Number>
      sent: <Send Tokens Number>
      [timelock_expiration]: <Pending Tokens Block Height Timelock Number>
      [transaction_fee]: <Funding Transaction Fee Tokens Number>
      transaction_id: <Channel Funding Transaction Id String>
      transaction_vout: <Channel Funding Transaction Vout Number>
      [transaction_weight]: <Funding Transaction Weight Number>
      type: <Row Type String>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!lnd || !lnd.default || !lnd.default.pendingChannels) {
        return cbk([400, 'ExpectedLndForPendingChannelsRequest']);
      }

      return cbk();
    },

    getPending: ['validate', ({}, cbk) => {
      return lnd.default.pendingChannels({}, (err, res) => {
        if (!!err) {
          return cbk([503, 'UnexpectedPendingChannelsErr', {err}]);
        }

        if (!res || !isArray(res.pending_open_channels)) {
          return cbk([503, 'ExpectedPendingOpenChannels']);
        }

        if (!res || !isArray(res.pending_closing_channels)) {
          return cbk([503, 'ExpectedPendingClosingChannels']);
        }

        if (!res || !isArray(res.pending_force_closing_channels)) {
          return cbk([503, 'ExpectedPendingForceCloseChannels']);
        }

        const forceClosing = {};

        res.pending_force_closing_channels.forEach(n => {
          return forceClosing[n.channel.channel_point] = {
            close_transaction_id: n.closing_txid,
            pending_balance: parseInt(n.limbo_balance, decBase),
            pending_payments: n.pending_htlcs.map(htlc => {
              const [txId, vout] = htlc.outpoint.split(outpointSeparator);

              return {
                is_incoming: htlc.incoming,
                timelock_height: htlc.maturity_height,
                tokens: parseInt(htlc.amount, decBase),
                transaction_id: txId,
                transaction_vout: parseInt(vout, decBase),
              };
            }),
            recovered_tokens: parseInt(n.recovered_balance, decBase),
            timelock_expiration: n.maturity_height,
          };
        });

        const coopClosing = {};

        res.pending_closing_channels.forEach(n => {
          return coopClosing[n.channel.channel_point] = {
            close_transaction_id: n.closing_txid,
          };
        });

        const opening = {};

        res.pending_open_channels.forEach(n => {
          return opening[n.channel.channel_point] = {
            transaction_fee: parseInt(n.commit_fee, decBase),
            transaction_weight: parseInt(n.commit_weight, decBase),
          };
        });

        const waitClosing = {};

        res.waiting_close_channels.forEach(n => {
          return waitClosing[n.channel.channel_point] = {
            pending_balance: parseInt(n.limbo_balance, decBase),
          };
        });

        const channels = []
          .concat(res.pending_open_channels)
          .concat(res.pending_closing_channels)
          .concat(res.pending_force_closing_channels)
          .concat(res.waiting_close_channels)
          .map(n => n.channel);

        return cbk(null, {
          channels,
          coopClosing,
          forceClosing,
          opening,
          waitClosing,
        });
      });
    }],

    // Assemble and check pending channels
    pendingChannels: ['getPending', ({getPending}, cbk) => {
      const {coopClosing} = getPending;
      const {forceClosing} = getPending;
      const {opening} = getPending;
      const {waitClosing} = getPending;

      return asyncMap(getPending.channels, (channel, cbk) => {
        if (!channel.channel_point) {
          return cbk([503, 'ExpectedChannelOutpoint']);
        }

        const coop = coopClosing[channel.channel_point] || {};
        const forced = forceClosing[channel.channel_point] || {};
        const chanOpen = opening[channel.channel_point];
        const [transactionId, vout] = channel.channel_point.split(':');
        const wait = waitClosing[channel.channel_point] || {};

        if (channel.local_balance === undefined) {
          return cbk([503, 'ExpectedLocalBalance']);
        }

        if (!channel.remote_node_pub) {
          return cbk([503, 'ExpectedRemoteNodePub']);
        }

        if (channel.remote_balance === undefined) {
          return cbk([503, 'ExpectedRemoteBalance']);
        }

        const pendingBalance = wait.pending_balance || forced.pending_balance;

        const endTx = coop.close_transaction_id || forced.close_transaction_id;

        return cbk(null, {
          close_transaction_id: endTx || undefined,
          is_active: false,
          is_closing: !chanOpen,
          is_opening: !!chanOpen,
          local_balance: parseInt(channel.local_balance, decBase),
          partner_public_key: channel.remote_node_pub,
          pending_balance: pendingBalance || undefined,
          pending_payments: forced.pending_payments || undefined,
          received: 0,
          recovered_tokens: forced.recovered_tokens || undefined,
          remote_balance: parseInt(channel.remote_balance, decBase),
          sent: 0,
          timelock_expiration: forced.timelock_expiration || undefined,
          transaction_fee: !chanOpen ? null : chanOpen.transaction_fee,
          transaction_id: transactionId,
          transaction_vout: parseInt(vout, decBase),
          transaction_weight: !chanOpen ? null : chanOpen.transaction_weight,
          type: rowTypes.channel,
        });
      },
      cbk);
    }],

    // Final set of pending channels
    pending: ['pendingChannels', ({pendingChannels}, cbk) => {
      return cbk(null, {pending_channels: pendingChannels});
    }],
  },
  returnResult({of: 'pending'}, cbk));
};
