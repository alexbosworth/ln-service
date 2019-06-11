const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const defaultMinConfs = 1;
const minChannelTokens = 20000;

/** Open a new channel.

  {
    [chain_fee_tokens_per_vbyte]: <Chain Fee Tokens Per VByte Number>
    [give_tokens]: <Tokens to Gift To Partner Number> // Defaults to zero
    [is_private]: <Channel is Private Bool> // Defaults to false
    lnd: <Authenticated LND gRPC API Object>
    local_tokens: <Local Tokens Number>
    [min_confirmations]: <Spend UTXOs With Minimum Confirmations Number>
    [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    partner_public_key: <Public Key Hex String>
    [partner_csv_delay]: <Peer Output CSV Delay Number>
  }

  @returns via cbk or Promise
  {
    transaction_id: <Funding Transaction Id String>
    transaction_vout: <Funding Transaction Output Index Number>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default || !args.lnd.default.openChannel) {
          return cbk([400, 'ExpectedLndForChannelOpen']);
        }

        if (!args.local_tokens) {
          return cbk([400, 'ExpectedLocalTokensNumberToOpenChannelWith']);
        }

        if (!args.partner_public_key) {
          return cbk([400, 'ExpectedPartnerPublicKeyForChannelOpen']);
        }

        if (args.local_tokens < minChannelTokens) {
          return cbk([400, 'ExpectedLargerChannelSizeForChannelOpen']);
        }

        return cbk();
      },

      // Determine the minimum confs for spend utxos
      minConfs: ['validate', ({}, cbk) => {
        if (args.min_confirmations === undefined) {
          return cbk(null, defaultMinConfs);
        }

        return cbk(null, args.min_confirmations);
      }],

      // Open the channel
      openChannel: ['minConfs', ({minConfs}, cbk) => {
        let isAnnounced = false;

        const options = {
          local_funding_amount: args.local_tokens,
          min_confs: minConfs,
          min_htlc_msat: args.min_htlc_mtokens || undefined,
          node_pubkey: Buffer.from(args.partner_public_key, 'hex'),
          private: !!args.is_private,
          remote_csv_delay: args.partner_csv_delay || undefined,
          spend_unconfirmed: !minConfs,
        }

        if (!!args.chain_fee_tokens_per_vbyte) {
          options.sat_per_byte = args.chain_fee_tokens_per_vbyte;
        }

        if (!!args.give_tokens) {
          options.push_sat = args.give_tokens;
        }

        const channelOpen = args.lnd.default.openChannel(options);

        channelOpen.on('data', chan => {
          switch (chan.update) {
          case 'chan_open':
            break;

          case 'chan_pending':
            if (isAnnounced) {
              break;
            }

            isAnnounced = true;

            channelOpen.removeAllListeners();

            return cbk(null, {
              transaction_id: chan.chan_pending.txid.reverse().toString('hex'),
              transaction_vout: chan.chan_pending.output_index,
            });
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

          channelOpen.removeAllListeners();

          if (!n || !n.details) {
            return cbk([503, 'UnknownChannelOpenStatus']);
          }

          if (/^Unknown.chain/.test(n.details)) {
            return cbk([503, 'ChainUnsupported']);
          }

          switch (n.details) {
          case 'cannot open channel to self':
            return cbk([400, 'CannotOpenChannelToOwnNode']);

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
    returnResult({reject, resolve, of: 'openChannel'}, cbk));
  });
};
