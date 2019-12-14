const {test} = require('tap');

const {getClosedChannels} = require('./../../');

const makeLnd = (err, override, response) => {
  const channel = {
    capacity: '1',
    chan_id: '1',
    channel_point: '00:1',
    close_height: 1,
    closing_tx_hash: '00',
    remote_pubkey: 'b',
    settled_balance: '1',
    time_locked_balance: '1',
  };

  Object.keys(override || {}).forEach(key => channel[key] = override[key]);

  const r = response !== undefined ? response : {channels: [channel]};

  return {default: {closedChannels: ({}, cbk) => cbk(err, r)}};
};

const makeArgs = ({override}) => {
  const args = {
    is_breach_close: false,
    is_cooperative_close: false,
    is_funding_cancel: false,
    is_local_force_close: false,
    is_remote_force_close: false,
    lnd: makeLnd(),
  };

  Object.keys(override || {}).forEach(key => args[key] = override[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({override: {lnd: undefined}}),
    description: 'LND is required',
    error: [400, 'ExpectedLndApiForGetClosedChannelsRequest'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd('err')}}),
    description: 'Errors are passed back',
    error: [503, 'FailedToRetrieveClosedChannels', {err: 'err'}],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, null, false)}}),
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToGetCloseChannels'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, null, {})}}),
    description: 'A response with channels is expected',
    error: [503, 'ExpectedChannels'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, {capacity: undefined})}}),
    description: 'Capacity is expected',
    error: [503, 'ExpectedCloseChannelCapacity'],
  },
  {
    args: makeArgs({override: {lnd: makeLnd(null, {chan_id: undefined})}}),
    description: 'Channel id is expected',
    error: [503, 'ExpectedChannelIdOfClosedChannel'],
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      await rejects(getClosedChannels(args), error, 'Got expected error');
    } else {
      const {channels} = await getClosedChannels(args);

      deepIs(channels, expected.channels, 'Got expected channels');
    }

    return end();
  });
});
