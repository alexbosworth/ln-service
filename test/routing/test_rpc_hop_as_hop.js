const {test} = require('tap');

const rpcHopAsHop = require('./../../routing/rpc_hop_as_hop');

const expected = {
  channel: '0x0x1',
  channel_capacity: 1,
  fee: 1,
  fee_mtokens: '1000',
  forward: 1,
  forward_mtokens: '1000',
  public_key: 'a',
  timeout: 1,
};

const makeHop = override => {
  const hop = {
    amt_to_forward_msat: '1000',
    chan_id: '1',
    chan_capacity: 1,
    expiry: 1,
    fee_msat: '1000',
    mpp_record: {payment_addr: Buffer.alloc(1), total_amt_msat: '1'},
    pub_key: 'a',
    tlv_payload: true,
  };

  Object.keys(override).forEach(key => hop[key] = override[key]);

  return hop;
};

const tests = [
  {
    args: null,
    description: 'A rpc hop is required to map to a hop',
    error: 'ExpectedRpcHopToDeriveHop',
  },
  {
    args: makeHop({amt_to_forward_msat: null}),
    description: 'Amount to forward msat is expected',
    error: 'ExpectedAmountToForwardMillisatoshisInRpcHopDetails',
  },
  {
    args: makeHop({chan_id: null}),
    description: 'Channel id is expected',
    error: 'ExpectedNumericChannelIdInRpcHopDetails',
  },
  {
    args: makeHop({chan_capacity: undefined}),
    description: 'Channel capacity is expected',
    error: 'ExpectedChannelCapacityTokensNumberInRpcHopDetails',
  },
  {
    args: makeHop({expiry: undefined}),
    description: 'Expiry is expected',
    error: 'ExpectedHtlcForwardExpiryHeightInRpcHopDetails',
  },
  {
    args: makeHop({fee_msat: undefined}),
    description: 'Forwarding fee millitokens is expected',
    error: 'ExpectedHtlcForwardingMillitokensFeeInRpcHopDetails',
  },
  {
    args: makeHop({fee_msat: undefined}),
    description: 'Forwarding fee millitokens is expected',
    error: 'ExpectedHtlcForwardingMillitokensFeeInRpcHopDetails',
  },
  {
    args: makeHop({mpp_record: {total_amt_msat: '1'}}),
    description: 'Payment address is expected',
    error: 'ExpectedMultipathPaymentAddressInRecord',
  },
  {
    args: makeHop({mpp_record: {payment_addr: Buffer.alloc(1)}}),
    description: 'Total amount millitokens is expected',
    error: 'ExpectedMultipathRecordTotalPaymentAmountMillitokens',
  },
  {
    args: makeHop({pub_key: undefined}),
    description: 'A public key is expected',
    error: 'ExpectedForwardToPublicKeyInRpcHopDetails',
  },
  {
    args: makeHop({tlv_payload: undefined}),
    description: 'A public key is expected',
    error: 'ExpectedTlvPayloadPresenceInRpcHopDetails',
  },
  {
    expected, args: makeHop({}), description: 'A hop is mapped',
  },
  {
    expected,
    args: makeHop({tlv_payload: false}),
    description: 'A hop is mapped when there is no tlv payload',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(({deepIs, end, equal, throws}) => {
    if (!!error) {
      throws(() => rpcHopAsHop(args), new Error(error), 'Got err');
    } else {
      const hop = rpcHopAsHop(args);

      equal(hop.channel, expected.channel, 'Got expected channel');
      equal(hop.channel_capacity, expected.channel_capacity, 'Got capacity');
      equal(hop.fee, expected.fee, 'Got hop forwarding fee');
      equal(hop.fee_mtokens, expected.fee_mtokens, 'Got forward fee mtokens');
      equal(hop.forward, expected.forward, 'Got forward tokens');
      equal(hop.forward_mtokens, expected.forward_mtokens, 'Got mtokens');
      equal(hop.public_key, expected.public_key, 'Got expected public key');
      equal(hop.timeout, expected.timeout, 'Got expected CLTV expiry height');
    }

    return end();
  })
});
