const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {returnResult} = require('asyncjs-util');

const {isArray} = Array;
const outpointSeparator = ':';

/** Get pending channels.

  Both is_closing and is_opening are returned as part of a channel because
  a channel may be opening, closing, or active.

  Requires `offchain:read` permission

  `is_partner_initiated` is not accurate on LND 0.9.2 and below.

  {
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    pending_channels: [{
      [close_transaction_id]: <Channel Closing Transaction Id String>
      is_active: <Channel Is Active Bool>
      is_closing: <Channel Is Closing Bool>
      is_opening: <Channel Is Opening Bool>
      [is_partner_initiated]: <Channel Partner Initiated Channel Bool>
      local_balance: <Channel Local Tokens Balance Number>
      local_reserve: <Channel Local Reserved Tokens Number>
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
      remote_reserve: <Channel Remote Reserved Tokens Number>
      sent: <Send Tokens Number>
      [timelock_expiration]: <Pending Tokens Block Height Timelock Number>
      [transaction_fee]: <Funding Transaction Fee Tokens Number>
      transaction_id: <Channel Funding Transaction Id String>
      transaction_vout: <Channel Funding Transaction Vout Number>
      [transaction_weight]: <Funding Transaction Weight Number>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
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

          if (!res || !isArray(res.pending_force_closing_channels)) {
            return cbk([503, 'ExpectedPendingForceCloseChannels']);
          }

          if (!res || !isArray(res.pending_open_channels)) {
            return cbk([503, 'ExpectedPendingOpenChannels']);
          }

          const forceClosing = {};

          res.pending_force_closing_channels.forEach(n => {
            return forceClosing[n.channel.channel_point] = {
              close_transaction_id: n.closing_txid,
              pending_balance: Number(n.limbo_balance),
              pending_payments: n.pending_htlcs.map(htlc => {
                const [txId, vout] = htlc.outpoint.split(outpointSeparator);

                return {
                  is_incoming: htlc.incoming,
                  timelock_height: htlc.maturity_height,
                  tokens: Number(htlc.amount),
                  transaction_id: txId,
                  transaction_vout: Number(vout),
                };
              }),
              recovered_tokens: Number(n.recovered_balance),
              timelock_expiration: n.maturity_height,
            };
          });

          const coopClosing = {};
          const opening = {};

          res.pending_open_channels.forEach(n => {
            return opening[n.channel.channel_point] = {
              transaction_fee: Number(n.commit_fee),
              transaction_weight: Number(n.commit_weight),
            };
          });

          const waitClosing = {};

          res.waiting_close_channels.forEach(n => {
            return waitClosing[n.channel.channel_point] = {
              pending_balance: Number(n.limbo_balance),
            };
          });

          const channels = []
            .concat(res.pending_open_channels)
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

          const coopCloseTxId = coop.close_transaction_id;
          const pendingTokens = wait.pending_balance || forced.pending_balance;

          const endTx = coopCloseTxId || forced.close_transaction_id;

          return cbk(null, {
            close_transaction_id: endTx || undefined,
            is_active: false,
            is_closing: !chanOpen,
            is_opening: !!chanOpen,
            is_partner_initiated: !channel.initiated,
            local_balance: Number(channel.local_balance),
            local_reserve: Number(channel.local_chan_reserve_sat),
            partner_public_key: channel.remote_node_pub,
            pending_balance: pendingTokens || undefined,
            pending_payments: forced.pending_payments || undefined,
            received: 0,
            recovered_tokens: forced.recovered_tokens || undefined,
            remote_balance: Number(channel.remote_balance),
            remote_reserve: Number(channel.remote_chan_reserve_sat),
            sent: 0,
            timelock_expiration: forced.timelock_expiration || undefined,
            transaction_fee: !chanOpen ? null : chanOpen.transaction_fee,
            transaction_id: transactionId,
            transaction_vout: Number(vout),
            transaction_weight: !chanOpen ? null : chanOpen.transaction_weight,
          });
        },
        cbk);
      }],

      // Final set of pending channels
      pending: ['pendingChannels', ({pendingChannels}, cbk) => {
        return cbk(null, {pending_channels: pendingChannels});
      }],
    },
    returnResult({reject, resolve, of: 'pending'}, cbk));
  });
};
