const asyncAuto = require('async/auto');
const {channelEdgeAsChannel} = require('./../graph');
const {returnResult} = require('asyncjs-util');

const colorTemplate = '#000000';
const decBase = 10;
const {isArray} = Array;
const msPerSec = 1e3;

/** Get information about a node

  {
    lnd: <Authenticated LND gRPC API Object>
    public_key: <Node Public Key Hex String>
  }

  @returns via cbk or Promise
  {
    alias: <Node Alias String>
    capacity: <Node Total Capacity Tokens Number>
    channel_count: <Known Node Channels Number>
    [channels]: [{
      capacity: <Maximum Tokens Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel Is Disabled Bool>
        [max_htlc_mtokens]: <Maximum HTLC Millitokens Value String>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens Value String>
        public_key: <Node Public Key String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      [updated_at]: <Channel Last Updated At ISO 8601 Date String>
    }]
    color: <RGB Hex Color String>
    sockets: [{
      socket: <Host and Port String>
      type: <Socket Type String>
    }]
    [updated_at]: <Last Known Update ISO 8601 Date String>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.default || !args.lnd.default.getNodeInfo) {
          return cbk([400, 'ExpectedLndApiObjectToGetNodeInfo']);
        }

        if (!args.public_key) {
          return cbk([400, 'ExpectedPublicKeyForNodeInfo']);
        }

        return cbk();
      },

      // Get node
      getNode: ['validate', ({}, cbk) => {
        args.lnd.default.getNodeInfo({
          pub_key: args.public_key,
        },
        (err, res) => {
          if (!!err && err.details === 'unable to find node') {
            return cbk([404, 'NodeIsUnknown']);
          }

          if (!!err) {
            return cbk([503, 'FailedToRetrieveNodeDetails', {err}]);
          }

          if (!res.node) {
            return cbk([503, 'ExpectedNodeDetailsForNodeDetailsRequest']);
          }

          if (!isArray(res.node.addresses)) {
            return cbk([503, 'ExpectedArrayOfNodeAddressForNodeDetails']);
          }

          try {
            res.node.addresses.forEach(({addr, network}) => {
              if (!addr) {
                throw new Error('ExpectedNodeAddress');
              }

              if (!network) {
                throw new Error('ExpectedNodeNetwork');
              }
            });
          } catch (err) {
            return cbk([503, err.message]);
          }

          if (res.node.alias === undefined) {
            return cbk([503, 'ExpectedNodeAliasFromNodeDetails']);
          }

          if (!!res.channels) {
            try {
              res.channels.forEach(channel => channelEdgeAsChannel(channel));
            } catch (err) {
              return cbk([503, err.message]);
            }
          }

          const expectedColorLen = colorTemplate.length;

          if (!res.node.color || res.node.color.length !== expectedColorLen) {
            return cbk([503, 'ExpectedNodeColor']);
          }

          if (res.node.last_update === undefined) {
            return cbk([503, 'ExpectedNodeLastUpdateTimestamp']);
          }

          if (!res.node.pub_key) {
            return cbk([503, 'ExpectedNodeDetailsPublicKey']);
          }

          if (res.num_channels === undefined) {
            return cbk([503, 'ExpectedNodeDetailsChannelCount']);
          }

          if (!res.total_capacity) {
            return cbk([503, 'ExpectedTotalCapacityForNode']);
          }

          const nodeChannels = res.channels || [];
          const updatedAt = res.node.last_update * msPerSec;

          const updated = !updatedAt ? undefined : new Date(updatedAt);

          return cbk(null, {
            alias: res.node.alias,
            capacity: parseInt(res.total_capacity, decBase),
            channel_count: res.num_channels,
            channels: nodeChannels.map(chan => channelEdgeAsChannel(chan)),
            color: res.node.color,
            sockets: res.node.addresses.map(({addr, network}) => ({
              socket: addr,
              type: network,
            })),
            updated_at: !updated ? undefined : updated.toISOString(),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'getNode'}, cbk));
  });
};
