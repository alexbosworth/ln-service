const {test} = require('tap');

const {updateRoutingFees} = require('./../../');

const tests = [
  {
    args: {},
    description: 'Authenticated LND is required to update routing fees',
    error: [400, 'ExpectedLndForRoutingFeesUpdate'],
  },
  {
    args: {lnd: {}},
    description: 'Authenticated regular LND required to update fees',
    error: [400, 'ExpectedLndForRoutingFeesUpdate'],
  },
  {
    args: {lnd: {default: {}}, transaction_vout: 0},
    description: 'A full chanpoint with vout is required for an update',
    error: [400, 'UnexpectedTransactionIdForGlobalFeeUpdate'],
  },
  {
    args: {lnd: {default: {}}, transaction_id: 'id'},
    description: 'A full chanpoint is required for a routing fee update',
    error: [400, 'UnexpectedTxOutputIndexForGlobalFeeUpdate'],
  },
  {
    args: {lnd: {default: {updateChannelPolicy: ({}, cbk) => cbk('err')}}},
    description: 'Errors are returned',
    error: [503, 'UnexpectedErrorUpdatingRoutingFees', {err: 'err'}],
  },
  {
    args: {lnd: {default: {updateChannelPolicy: (args, cbk) => {
      if (args.base_fee_msat !== '1000') {
        return cbk('ExpectedBaseFeeMsat');
      }

      if (args.chan_point !== undefined) {
        return cbk('ExpectedChanPointUndefined');
      }

      if (args.fee_rate !== 0.000001) {
        return cbk('ExpectedMinimalFeeRate');
      }

      if (args.global !== true) {
        return cbk('ExpectedGlobalRoutingFeeUpdate');
      }

      if (args.max_htlc_msat !== undefined) {
        return cbk('ExpectedMaxHtlcMsatUndefined');
      }

      if (args.time_lock_delta !== 40) {
        return cbk('ExpectedDefaultCltvDelta');
      }

      return cbk();
    }}}},
    description: 'Channel policy is updated',
  },
  {
    args: {
      base_fee_tokens: '99',
      cltv_delta: 1,
      fee_rate: 99,
      lnd: {
        default: {
          updateChannelPolicy: (args, cbk) => {
            if (args.base_fee_msat !== '99000') {
              return cbk('ExpectedBaseFeeMsat');
            }

            if (args.chan_point.funding_txid_str !== '1') {
              return cbk('ExpectedChanTxId');
            }

            if (args.chan_point.output_index !== 0) {
              return cbk('ExpectedChanTxVout');
            }

            if (args.fee_rate !== 0.000099) {
              return cbk('ExpectedFeeRate');
            }

            if (args.global !== undefined) {
              return cbk('ExpectedLocalRoutingFeeUpdate');
            }

            if (args.max_htlc_msat !== '1') {
              return cbk('ExpectedMaxHtlcMsatUndefined');
            }

            if (args.time_lock_delta !== 1) {
              return cbk('ExpectedCltvDelta');
            }

            return cbk();
          },
        },
      },
      max_htlc_mtokens: '1',
      transaction_id: '1',
      transaction_vout: 0,
    },
    description: 'Channel policy is updated',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async ({deepIs, end, rejects}) => {
    if (!!error) {
      rejects(updateRoutingFees(args), error, 'Got expected error');
    } else {
      await updateRoutingFees(args);
    }

    return end();
  });
});
