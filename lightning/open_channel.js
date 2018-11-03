const asyncAuto = require('async/auto');
const asyncRetry = require('async/retry');

const addPeer = require('./add_peer');
const channelLimit = require('./conf/lnd').channel_limit_tokens;
const getChainBalance = require('./get_chain_balance');
const getPeers = require('./get_peers');
const {returnResult} = require('./../async-util');

const defaultMinConfs = 1;
const interval = retryCount => 50 * Math.pow(2, retryCount);
const staticFee = 1e3;
const minimumChannelSize = 20000;
const times = 5;

/** Open a new channel.

  {
    [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
    [give_tokens]: <Tokens to Give To Partner Number> // Defaults to zero
    [is_private]: <Channel is Private Bool> // Defaults to false
    lnd: <LND GRPC API Object>
    [local_tokens]: <Local Tokens Number> // Defaults to max possible tokens
    partner_public_key: <Public Key Hex String>
    [socket]: <Peer Socket String>
  }

  @returns via cbk
  {
    transaction_id: <Funding Transaction Id String>
    transaction_vout: <Funding Transaction Output Index Number>
    type: <Row Type String> // 'channel_pending'
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.lnd || !args.lnd.openChannel) {
        return cbk([400, 'ExpectedLndForChannelOpen']);
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

    // Add the peer if necessary
    addPeer: ['validate', ({}, cbk) => {
      if (!args.socket) {
        return cbk();
      }

      return addPeer({
        lnd: args.lnd,
        public_key: args.partner_public_key,
        socket: args.socket,
      },
      cbk);
    }],

    // Check that the peer is connected
    checkPeers: ['addPeer', ({}, cbk) => {
      return asyncRetry({interval, times}, cbk => {
        return getPeers({lnd: args.lnd}, (err, res) => {
          if (!!err) {
            return cbk(err);
          }

          const {peers} = res;

          if (!peers.find(n => n.public_key === args.partner_public_key)) {
            return cbk([400, 'ExpectedConnectedPeerPublicKeyForChannelOpen']);
          }

          return cbk();
        });
      },
      cbk);
    }],

    // Get the current chain balance
    getBalance: ['validate', ({}, cbk) => {
      return getChainBalance({lnd: args.lnd}, cbk);
    }],

    // Open the channel
    openChannel: ['getBalance', 'checkPeers', ({getBalance}, cbk) => {
      const balance = getBalance.chain_balance;
      let isAnnounced = false;
      const limit = channelLimit;

      const maxTokens = balance > limit ? limit : balance;

      const channelAmount = args.local_tokens ? args.local_tokens : maxTokens;

      const options = {
        local_funding_amount: channelAmount - staticFee,
        min_confs: defaultMinConfs,
        node_pubkey: Buffer.from(args.partner_public_key, 'hex'),
        private: !!args.is_private,
      }

      if (!!args.chain_fee_tokens_per_vbyte) {
        options.sat_per_byte = args.chain_fee_tokens_per_vbyte;
      }

      if (!!args.give_tokens) {
        options.push_sat = args.give_tokens;
      }

      const channelOpen = args.lnd.openChannel(options);

      channelOpen.on('data', chan => {
        switch (chan.update) {
        case 'chan_open':
          break;

        case 'chan_pending':
          if (isAnnounced) {
            break;
          }

          isAnnounced = true;

          return cbk(null, {
            transaction_id: chan.chan_pending.txid.reverse().toString('hex'),
            transaction_vout: chan.chan_pending.output_index,
            type: 'open_channel_pending',
          })
          break;

        case 'confirmation':
          break;

        default:
          break;
        }
      });

      channelOpen.on('end', () => {});

      channelOpen.on('error', err => {});

      channelOpen.on('status', n => {
        if (isAnnounced) {
          return;
        }

        isAnnounced = true;

        if (!n || !n.details) {
          return cbk([503, 'UnknownChannelOpenStatus']);
        }

        if (/^Unknown.chain/.test(n.details)) {
          return cbk([503, 'ChainUnsupported']);
        }

        switch (n.details) {
        case 'Multiple channels unsupported':
          return cbk([503, 'RemoteNodeDoesNotSupportMultipleChannels']);

        case 'peer disconnected':
          return cbk([503, 'RemotePeerDisconnected']);

        case 'Synchronizing blockchain':
          return cbk([503, 'RemoteNodeSyncing']);

        default:
          return cbk([503, 'FailedToOpenChannel', n]);
        }
      });

      return;
    }],
  },
  returnResult({of: 'openChannel'}, cbk));
};

