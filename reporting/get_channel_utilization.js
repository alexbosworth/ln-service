const asyncAuto = require('async/auto');

const decodeShortChannelId = require('./../bolt07').decodeFromNumber;
const {getChannels} = require('./../lightning');
const {getNetworkGraph} = require('./../lightning');
const {returnResult} = require('./../async-util');

const aliasByteLimit = 32;

/** Generate channel utilization report.

  This is an opinionated report that assigns a subjective score to peers.

  {
    lnd: <LND GRPC Object>
  }

  @returns via cbk
  {
    utilization: [{
      age: <Count of Blocks From Maximum Channel Height Number>
      alias: <Peer Alias or Truncated Public Key String>
      id: <Short Channel Id String>
      local_age: <Local Channel Balance Over Time Number>
      received_per_block: <Received Balance Over Time Number>
      remote_age: <Remote Channel Balance Over Time Number>
      score: <Utilization Score>
      sent_per_block: <Sent Tokens Over Time Number>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return asyncAuto({
    // Get current channels
    getChannels: cbk => getChannels({lnd}, cbk),

    // Get the network graph to derive aliases for peers
    getNetworkGraph: cbk => getNetworkGraph({lnd}, cbk),

    // Derive aliases for public keys
    aliases: ['getNetworkGraph', ({getNetworkGraph}, cbk) => {
      const aliases = {};

      getNetworkGraph.nodes.forEach(n => aliases[n.public_key] = n.alias);

      return cbk(null, aliases);
    }],

    // Aggregate channel values together
    channels: ['aliases', 'getChannels', ({aliases, getChannels}, cbk) => {
      const sums = {};

      getChannels.channels.forEach(c => {
        // For some reason chan ids are sometimes '0'
        if (c.id === '0') {
          return;
        }

        const height = decodeShortChannelId({id: c.id}).block_height;
        const sum = sums[c.partner_public_key] || {};

        const prevHeight = sum.block_height || height;

        sum.alias = aliases[c.partner_public_key];
        sum.block_height = Math.round((height + prevHeight) / 2);
        sum.local_balance = c.local_balance + (sum.local_balance || 0);
        sum.id = [].concat(sum.id).concat(c.id).filter(n => !!n).sort()[0];
        sum.public_key = c.partner_public_key;
        sum.received = c.received + (sum.received || 0);
        sum.remote_balance = c.remote_balance + (sum.remote_balance || 0);
        sum.sent = c.sent + (sum.sent || 0);

        sums[c.partner_public_key] = sum;
      });

      return cbk(null, Object.keys(sums).map(n => sums[n]));
    }],

    // Generate report data
    utilization: ['channels', ({channels}, cbk) => {
      const maxHeight = Math.max(...channels.map(n => n.block_height));

      const utilization = channels.filter(({id}) => id !== '0').map(n => {
        const alias = n.alias.replace(/[^\x00-\x7F]/g, '?').trim();
        const blocks = maxHeight - n.block_height + 1;
        const local = n.local_balance;
        const remote = n.remote_balance;

        // An out-chan is one where there's 100% local balance
        const isOutChan = (!!n.local_balance && !n.remote_balance) === true;

        // Bonus for channels that assign remote funds more than local funds
        const remoteCommitmentScore = (remote * 10 - local) * blocks / 1e10;

        // Void remote commitment bonus when the channel is self-initiated
        const remoteBonus = isOutChan ? 0 : remoteCommitmentScore;

        // Bonus for channels that are used to send (vs time and size)
        const sentScore = n.sent / blocks / (local || 1) * 1e12;

        // Bonus for channels that are used to receive (vs time and size)
        const receiveScore = n.received / blocks / (remote || 1) * 1e10;

        // Penalty for holding local balance
        const localBalanceScore = -1 * local * blocks / 1e8;

        return {
          age: blocks,
          alias: alias || n.public_key.substring(0, aliasByteLimit),
          id: n.id,
          local_age: n.local_balance * blocks,
          received_per_block: n.received / blocks,
          remote_age: n.remote_balance * blocks,
          score: remoteBonus + sentScore + receiveScore + localBalanceScore,
          sent_per_block: n.sent / blocks,
        };
      });

      utilization.sort((a, b) => a.score > b.score ? -1 : 1);

      return cbk(null, {utilization});
    }],
  },
  returnResult({of: 'utilization'}, cbk));
};

