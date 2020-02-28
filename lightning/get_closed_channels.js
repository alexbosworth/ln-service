const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');

const emptyTxId = Buffer.alloc(32).toString('hex');;
const {isArray} = Array;
const method = 'closedChannels';
const outpointSeparator = ':';

/** Get closed out channels

  Multiple close type flags are supported.

  `is_partner_closed` and `is_partner_initiated` are not supported on LND 0.9.1
  and below.

  {
    [is_breach_close]: <Only Return Breach Close Channels Bool>
    [is_cooperative_close]: <Only Return Cooperative Close Channels Bool>
    [is_funding_cancel]: <Only Return Funding Canceled Channels Bool>
    [is_local_force_close]: <Only Return Local Force Close Channels Bool>
    [is_remote_force_close]: <Only Return Remote Force Close Channels Bool>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    channels: [{
      capacity: <Closed Channel Capacity Tokens Number>
      [close_confirm_height]: <Channel Close Confirmation Height Number>
      [close_transaction_id]: <Closing Transaction Id Hex String>
      final_local_balance: <Channel Close Final Local Balance Tokens Number>
      final_time_locked_balance: <Closed Channel Timelocked Tokens Number>
      [id]: <Closed Standard Format Channel Id String>
      is_breach_close: <Is Breach Close Bool>
      is_cooperative_close: <Is Cooperative Close Bool>
      is_funding_cancel: <Is Funding Cancelled Close Bool>
      is_local_force_close: <Is Local Force Close Bool>
      [is_partner_closed]: <Channel Was Closed By Channel Peer Bool>
      [is_partner_initiated]: <Channel Was Initiated By Channel Peer Bool>
      is_remote_force_close: <Is Remote Force Close Bool>
      partner_public_key: <Partner Public Key Hex String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Channel Funding Output Index Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!isLnd({method, lnd: args.lnd, type: 'default'})) {
          return cbk([400, 'ExpectedLndApiForGetClosedChannelsRequest'])
        }

        return cbk();
      },

      // Get closed channels
      getClosedChannels: ['validate', ({}, cbk) => {
        return args.lnd.default[method]({
          breach: args.is_breach_close || undefined,
          cooperative: args.is_cooperative_close || undefined,
          funding_canceled: args.is_breach_close || undefined,
          local_force: args.is_local_force_close || undefined,
          remote_force: args.is_remote_force_close || undefined,
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'FailedToRetrieveClosedChannels', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseToGetCloseChannels']);
          }

          if (!isArray(res.channels)) {
            return cbk([503, 'ExpectedChannels']);
          }

          return cbk(null, res.channels);
        });
      }],

      // Map channels
      mapChannels: ['getClosedChannels', ({getClosedChannels}, cbk) => {
        return asyncMapSeries(getClosedChannels, (chan, cbk) => {
          if (!chan.capacity) {
            return cbk([503, 'ExpectedCloseChannelCapacity']);
          }

          if (!chan.chan_id) {
            return cbk([503, 'ExpectedChannelIdOfClosedChannel']);
          }

          if (!chan.channel_point) {
            return cbk([503, 'ExpectedCloseChannelOutpoint']);
          }

          if (chan.close_height === undefined) {
            return cbk([503, 'ExpectedChannelCloseHeight']);
          }

          if (!chan.closing_tx_hash) {
            return cbk([503, 'ExpectedClosingTransactionId']);
          }

          if (!chan.remote_pubkey) {
            return cbk([503, 'ExpectedCloseRemotePublicKey']);
          }

          if (!chan.settled_balance) {
            return cbk([503, 'ExpectedFinalSettledBalance']);
          }

          if (!chan.time_locked_balance) {
            return cbk([503, 'ExpectedFinalTimeLockedBalanceForClosedChan']);
          }

          const finalTimeLock = Number(chan.time_locked_balance);
          const hasCloseTx = chan.closing_tx_hash !== emptyTxId;
          const hasId = chan.chan_id !== '0';
          const height = !chan.close_height ? undefined : chan.close_height;
          let isPartnerClosed;
          let isPartnerInitiated;
          const [txId, vout] = chan.channel_point.split(outpointSeparator);

          const chanId = !hasId ? null : chanFormat({number: chan.chan_id});
          const closeTxId = !hasCloseTx ? undefined : chan.closing_tx_hash;
          const isLocalCooperativeClose = chan.close_initiator === 'LOCAL';
          const isRemoteCooperativeClose = chan.close_initiator === 'REMOTE';

          // Try and determine if the channel was opened by our peer
          if (chan.open_initiator === 'LOCAL') {
            isPartnerInitiated = false;
          } else if (chan.open_initiator === 'REMOTE') {
            isPartnerInitiated = true;
          }

          // Try and determine if the channel was closed by our peer
          if (chan.close_initiator === 'LOCAL') {
            isPartnerClosed = false;
          } else if (chan.close_initiator === 'REMOTE') {
            isPartnerClosed = true;
          }

          if (chan.close_type === 'LOCAL_FORCE_CLOSE') {
            isPartnerClosed = false
          } else if (chan.close_type === 'REMOTE_FORCE_CLOSE') {
            isPartnerClosed = true;
          }

          return cbk(null, {
            capacity: Number(chan.capacity),
            close_confirm_height: height,
            close_transaction_id: closeTxId,
            final_local_balance: Number(chan.settled_balance),
            final_time_locked_balance: finalTimeLock,
            id: !chanId ? undefined : chanId.channel,
            is_breach_close: chan.close_type === 'BREACH_CLOSE',
            is_cooperative_close: chan.close_type === 'COOPERATIVE_CLOSE',
            is_funding_cancel: chan.close_type === 'FUNDING_CANCELED',
            is_local_force_close: chan.close_type === 'LOCAL_FORCE_CLOSE',
            is_partner_closed: isPartnerClosed,
            is_partner_initiated: isPartnerInitiated,
            is_remote_force_close: chan.close_type === 'REMOTE_FORCE_CLOSE',
            partner_public_key: chan.remote_pubkey,
            transaction_id: txId,
            transaction_vout: Number(vout),
          });
        },
        cbk);
      }],

      // Closed channels
      closedChannels: ['mapChannels', ({mapChannels}, cbk) => {
        return cbk(null, {channels: mapChannels});
      }],
    },
    returnResult({reject, resolve, of: 'closedChannels'}, cbk));
  });
};
