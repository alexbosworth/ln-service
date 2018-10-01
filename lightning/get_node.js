const colorTemplate = '#000000';
const decBase = 10;
const msPerSec = 1e3;

/** Get information about a node

  {
    lnd: <LND GRPC API Object>
    public_key: <Node Public Key Hex String>
  }

  @returns via cbk
  {
    alias: <Node Alias String>
    capacity: <Node Total Capacity Tokens Number>
    channel_count: <Known Node Channels Number>
    color: <RGB Hex Color String>
    sockets: [{
      socket: <Host and Port String>
      type: <Socket Type String>
    }]
    [updated_at]: <Last Known Update ISO 8601 Date String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd || !args.lnd.getNodeInfo) {
    return cbk([400, 'ExpectedLndApiObjectToGetNodeInfo']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKeyForNodeInfo']);
  }

  args.lnd.getNodeInfo({pub_key: args.public_key}, (err, res) => {
    if (!!err && err.details === 'unable to find node') {
      return cbk([404, 'NodeIsUnknown']);
    }

    if (!!err) {
      return cbk([503, 'FailedToRetrieveNodeDetails', err]);
    }

    if (!res.node) {
      return cbk([503, 'ExpectedNodeDetailsForNodeDetailsRequest']);
    }

    if (!Array.isArray(res.node.addresses)) {
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

    if (!res.node.color || res.node.color.length !== colorTemplate.length) {
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

    const updatedAt = res.node.last_update * msPerSec;

    return cbk(null, {
      alias: res.node.alias,
      capacity: parseInt(res.total_capacity, decBase),
      channel_count: res.num_channels,
      color: res.node.color,
      sockets: res.node.addresses.map(({addr, network}) => {
        return {socket: addr, type: network};
      }),
      updated_at: !!updatedAt ? new Date(updatedAt).toISOString() : undefined,
    });
  });
};

