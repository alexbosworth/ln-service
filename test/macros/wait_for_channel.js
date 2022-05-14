const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');
const {returnResult} = require('asyncjs-util');

const {getChannel} = require('./../../');
const {getChannels} = require('./../../');

const interval = 20;
const times = 10000;

/** Wait for channel to be open

  {
    [hidden]: <Channel is Private True Bool>
    id: <Channel Transaction Id Hex String>
    lnd: <Authenticated LND gRPC API Object>
    [vout]: <Channel Output Index Number>
  }

  @returns via cbk
  {
    capacity: <Channel Token Capacity Number>
    commit_transaction_fee: <Commit Transaction Fee Number>
    commit_transaction_weight: <Commit Transaction Weight Number>
    id: <Standard Format Channel Id String>
    is_active: <Channel Active Bool>
    is_closing: <Channel Is Closing Bool>
    is_opening: <Channel Is Opening Bool>
    is_partner_initiated: <Channel Partner Opened Channel>
    is_private: <Channel Is Private Bool>
    local_balance: <Local Balance Tokens Number>
    partner_public_key: <Channel Partner Public Key String>
    pending_payments: [{
      id: <Payment Preimage Hash Hex String>
      is_outgoing: <Payment Is Outgoing Bool>
      timeout: <Chain Height Expiration Number>
      tokens: <Payment Tokens Number>
    }]
    received: <Received Tokens Number>
    remote_balance: <Remote Balance Tokens Number>
    sent: <Sent Tokens Number>
    transaction_id: <Blockchain Transaction Id String>
    transaction_vout: <Blockchain Transaction Vout Number>
    unsettled_balance: <Unsettled Balance Tokens Number>
  }
*/
module.exports = ({hidden, id, lnd, vout}, cbk) => {
  if (!id) {
    return cbk([400, 'ExpectedTransactionIdToWaitForChannelOpen']);
  }

  if (!lnd || !lnd.default) {
    return cbk([400, 'ExpectedAuthenticatedLndToWaitForChannelOpen']);
  }

  return asyncRetry({interval, times}, cbk => {
    return asyncAuto({
      // Get channels
      getChannels: cbk => getChannels({lnd}, cbk),

      // Channel
      channel: ['getChannels', ({getChannels}, cbk) => {
        const chan = getChannels.channels.find(channel => {
          const txId = channel.transaction_id;
          const txVout = channel.transaction_vout;

          return txId === id && txVout === (vout || Number());
        });

        if (!chan) {
          return cbk([503, 'FailedToFindChannelWithTransactionId']);
        }

        return cbk(null, chan);
      }],

      // Get channel
      getChannel: ['channel', ({channel}, cbk) => {
        return getChannel({lnd, id: channel.id}, cbk);
      }],

      gotChannel: ['getChannel', ({getChannel}, cbk) => {
        const {policies} = getChannel;

        if (!!hidden) {
          return cbk();
        }

        if (!!policies.find(n => !n.cltv_delta)) {
          return cbk([503, 'FailedToFindChannelWithFullPolicyDetails']);
        }

        return cbk();
      }]
    },
    returnResult({of: 'channel'}, cbk));
  },
  cbk);
};
