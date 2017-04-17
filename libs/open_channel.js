const asyncAuto = require('async/auto');

const getChainBalance = require('./get_chain_balance');

/** Open a new channel.

  {
    lnd_grpc_api: <LND GRPC API Object>
    partner_public_key: <Public Key String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    getChainBalance: (cbk) => {
      return getChainBalance({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    openChannel: ['getChainBalance', (res, cbk) => {
      // FIXME: - cleanup and make work properly
      const fee = 1e5

      const open = args.lnd_grpc_api.openChannel({
        local_funding_amount: res.getChainBalance - fee,
        node_pubkey: Buffer.from(args.partner_public_key, 'hex'),
        num_confs: 1,
        push_sat: Math.round(res.getChainBalance / 2),
      });

      open.on('data', function(feature) {
        console.log("FEATURE", feature);
      });

      open.on('end', function() {
        console.log("END OPEN CHANNEL SEND");
      });

      open.on('status', function(status) {
        console.log("OPEN CHANNEL STATUS", status);
      });

      open.on('error', (error) => {
        console.log("OPEN CHANNEL ERROR", error);
      });

      return cbk();
    }],
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk();
  });
};

