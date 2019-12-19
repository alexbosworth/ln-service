const {test} = require('tap');

const {getChannels} = require('./../../');

const makeLnd = overrides => {
  const channel = {
    active: true,
    capacity: 1,
    chan_id: '1',
    channel_point: '00:1',
    close_address: 'cooperative_close_address',
    commit_fee: '1',
    commit_weight: '1',
    fee_per_kw: '1',
    local_balance: '1',
    local_chan_reserve_sat: '1',
    num_updates: 1,
    pending_htlcs: [{
      amount: '1',
      expiration_height: 1,
      hash_lock: Buffer.alloc(32),
      incoming: true,
    }],
    private: true,
    remote_balance: 1,
    remote_chan_reserve_sat: '1',
    remote_pubkey: 'b',
    total_satoshis_received: 1,
    total_satoshis_sent: 1,
    unsettled_balance: 1,
  };

  Object.keys(overrides).forEach(key => channel[key] = overrides[key]);

  return {
    default: {listChannels: ({}, cbk) => cbk(null, {channels: [channel]})},
  };
};

const tests = [
  {
    args: {},
    description: 'LND is required',
    error: [400, 'ExpectedLndToGetChannels'],
  },
  {
    args: {lnd: {default: {listChannels: ({}, cbk) => cbk('err')}}},
    description: 'List channel errors are passed back',
    error: [503, 'UnexpectedGetChannelsError', {err: 'err'}],
  },
  {
    args: {lnd: {default: {listChannels: ({}, cbk) => cbk()}}},
    description: 'A response is expected',
    error: [503, 'ExpectedChannelsArray'],
  },
  {
    args: {lnd: {default: {listChannels: ({}, cbk) => cbk(null, {})}}},
    description: 'A response is expected',
    error: [503, 'ExpectedChannelsArray'],
  },
  {
    args: {lnd: {default: {listChannels: ({}, cbk) => cbk(null, {})}}},
    description: 'A response is expected',
    error: [503, 'ExpectedChannelsArray'],
  },
  {
    args: {lnd: makeLnd({active: undefined})},
    description: 'An active state is expected',
    error: [503, 'ExpectedChannelActiveState'],
  },
  {
    args: {lnd: makeLnd({capacity: undefined})},
    description: 'Channel capacity is expected',
    error: [503, 'ExpectedChannelCapacity'],
  },
  {
    args: {lnd: makeLnd({chan_id: undefined})},
    description: 'Channel id is expected',
    error: [503, 'ExpectedChannelIdNumberInChannelsList'],
  },
  {
    args: {lnd: makeLnd({channel_point: ''})},
    description: 'Channel funding outpoint is expected',
    error: [503, 'ExpectedChannelPoint'],
  },
  {
    args: {lnd: makeLnd({commit_fee: undefined})},
    description: 'Channel commit fee is expected',
    error: [503, 'ExpectedCommitFee'],
  },
  {
    args: {lnd: makeLnd({commit_weight: undefined})},
    description: 'Channel commit weight is expected',
    error: [503, 'ExpectedCommitWeight'],
  },
  {
    args: {lnd: makeLnd({fee_per_kw: undefined})},
    description: 'Channel fee per kw is expected',
    error: [503, 'ExpectedFeePerKw'],
  },
  {
    args: {lnd: makeLnd({local_balance: undefined})},
    description: 'Local balance is expected',
    error: [503, 'ExpectedLocalBalance'],
  },
  {
    args: {lnd: makeLnd({local_chan_reserve_sat: undefined})},
    description: 'Local chan reserve is expected',
    error: [503, 'ExpectedLocalChannelReserveAmountInChannel'],
  },
  {
    args: {lnd: makeLnd({num_updates: undefined})},
    description: 'Number of updates is expected',
    error: [503, 'ExpectedNumUpdates'],
  },
  {
    args: {lnd: makeLnd({pending_htlcs: undefined})},
    description: 'Pending HTLCs is expected',
    error: [503, 'ExpectedChannelPendingHtlcs'],
  },
  {
    args: {lnd: makeLnd({private: undefined})},
    description: 'Private status is expected',
    error: [503, 'ExpectedChannelPrivateStatus'],
  },
  {
    args: {lnd: makeLnd({remote_balance: undefined})},
    description: 'Remote balance is expected',
    error: [503, 'ExpectedRemoteBalance'],
  },
  {
    args: {lnd: makeLnd({remote_chan_reserve_sat: undefined})},
    description: 'Remote channel reserve amount is expected',
    error: [503, 'ExpectedRemoteChannelReserveAmount'],
  },
  {
    args: {lnd: makeLnd({remote_pubkey: undefined})},
    description: 'Remote public key is expected',
    error: [503, 'ExpectedRemotePubkey'],
  },
  {
    args: {lnd: makeLnd({total_satoshis_received: undefined})},
    description: 'Total satoshis received is expected',
    error: [503, 'ExpectedTotalSatoshisReceived'],
  },
  {
    args: {lnd: makeLnd({total_satoshis_sent: undefined})},
    description: 'Total satoshis sent is expected',
    error: [503, 'ExpectedTotalSatoshisSent'],
  },
  {
    args: {lnd: makeLnd({unsettled_balance: undefined})},
    description: 'Unsettled balance is expected',
    error: [503, 'ExpectedUnsettledBalance'],
  },
  {
    args: {lnd: makeLnd({})},
    description: 'Channels are returned',
    expected: {
      channel: {
        capacity: 1,
        commit_transaction_fee: 1,
        commit_transaction_weight: 1,
        cooperative_close_address: 'cooperative_close_address',
        id: '0x0x1',
        is_active: true,
        is_closing: false,
        is_opening: false,
        is_partner_initiated: false,
        is_private: true,
        is_static_remote_key: undefined,
        local_balance: 1,
        local_reserve: 1,
        partner_public_key: 'b',
        pending_payments: [{
          id: '0000000000000000000000000000000000000000000000000000000000000000',
          is_outgoing: false,
          timeout: 1,
          tokens: 1,
        }],
        received: 1,
        remote_balance: 1,
        remote_reserve: 1,
        sent: 1,
        time_offline: undefined,
        time_online: undefined,
        transaction_id: '00',
        transaction_vout: 1,
        unsettled_balance: 1,
      },
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepEqual, end, equal, rejects}) => {
    if (!!error) {
      rejects(() => getChannels(args), error, 'Got expected error');
    } else {
      const {channels} = await getChannels(args);

      const [channel] = channels;

      deepEqual(channel, expected.channel, 'Got expected channel');
    }

    return end();
  });
});
