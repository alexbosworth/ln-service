const {test} = require('@alexbosworth/tap');

const {updateRoutingFees} = require('./../../');

const makeLnd = ({err, policy}) => {
  return {
    default: {
      updateChannelPolicy: (args, cbk) => {
        if (!!err) {
          return cbk(err);
        }

        if (args.base_fee_msat !== policy.base_fee_msat) {
          return cbk('UnexpectedBaseFeeMsat');
        }

        const gotPoint = args.chan_point || {};
        const chanPoint = policy.chan_point || {};

        if (gotPoint.funding_txid_str !== chanPoint.funding_txid_str) {
          return cbk('UnexpectedChanTxId');
        }

        if (gotPoint.output_index !== chanPoint.output_index) {
          return cbk('UnexpectedChanTxVout');
        }

        if (policy.fee_rate !== args.fee_rate) {
          return cbk('UnexpectedFeeRate');
        }

        if (policy.global !== args.global) {
          return cbk('UnexpectedGlobalFeeUpdate');
        }

        if (policy.max_htlc_msat !== args.max_htlc_msat) {
          return cbk('UnexpectedMaxHtlcMsatUndefined');
        }

        if (policy.time_lock_delta !== args.time_lock_delta) {
          return cbk('UnexpectedCltvDelta');
        }

        return cbk();
      },
    },
  };
};

const makeArgs = overrides => {
  const args = {
    base_fee_tokens: '99',
    cltv_delta: 1,
    fee_rate: 99,
    lnd: makeLnd({}),
    max_htlc_mtokens: '1',
    transaction_id: '1',
    transaction_vout: 0,
  };

  Object.keys(overrides).forEach(key => args[key] = overrides[key]);

  return args;
};

const tests = [
  {
    args: makeArgs({lnd: undefined}),
    description: 'Authenticated LND is required to update routing fees',
    error: [400, 'ExpectedLndForRoutingFeesUpdate'],
  },
  {
    args: makeArgs({base_fee_mtokens: '1', base_fee_tokens: 1}),
    description: 'A single unit format base fee is expected',
    error: [400, 'ExpectedEitherBaseFeeMtokensOrTokensNotBoth'],
  },
  {
    args: makeArgs({transaction_id: undefined}),
    description: 'A full chanpoint with vout is required for an update',
    error: [400, 'UnexpectedTransactionIdForGlobalFeeUpdate'],
  },
  {
    args: makeArgs({transaction_vout: undefined}),
    description: 'A full chanpoint is required for a routing fee update',
    error: [400, 'UnexpectedTxOutputIndexForGlobalFeeUpdate'],
  },
  {
    args: {lnd: makeLnd({err: 'err'})},
    description: 'Errors are returned',
    error: [503, 'UnexpectedErrorUpdatingRoutingFees', {err: 'err'}],
  },
  {
    args: {
      lnd: makeLnd({
        policy: {
          base_fee_msat: '1000',
          chan_point: undefined,
          fee_rate: 0.000001,
          global: true,
          max_htlc_msat: undefined,
          time_lock_delta: 40,
        },
      }),
      description: 'The global channel policy is updated',
    },
  },
  {
    args: {
      base_fee_mtokens: '1',
      lnd: makeLnd({
        policy: {
          base_fee_msat: '1',
          chan_point: undefined,
          fee_rate: 0.000001,
          global: true,
          max_htlc_msat: undefined,
          time_lock_delta: 40,
        },
      }),
      description: 'The global channel policy base fee mtokens is updated',
    },
  },
  {
    args: {
      base_fee_tokens: '99',
      cltv_delta: 1,
      fee_rate: 99,
      lnd: makeLnd({
        policy: {
          base_fee_msat: '99000',
          chan_point: {funding_txid_str: '1', output_index: 0},
          fee_rate: 0.000099,
          global: undefined,
          max_htlc_msat: '1',
          time_lock_delta: 1,
        },
      }),
      max_htlc_mtokens: '1',
      transaction_id: '1',
      transaction_vout: 0,
    },
    description: 'A local channel policy is updated',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      await rejects(updateRoutingFees(args), error, 'Got expected error');
    } else {
      await updateRoutingFees(args);
    }

    return end();
  });
});
