const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {sortBy} = require('lodash');

const {returnResult} = require('./../async-util');
const rowTypes = require('./conf/row_types');

const decBase = 10;
const defaultLimit = 100;
const msPerSec = 1e3;
const {parse} = JSON;
const {stringify} = JSON;

/** Get forwarded payments, from oldest to newest

  {
    [limit]: <Page Result Limit Number>
    lnd: <LND GRPC API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk
  {
    forwards: [{
      created_at: <Forward Record Created At ISO 8601 Date String>
      fee_mtokens: <Fee Millitokens Charged String>
      incoming_channel_id: <Incoming Channel Id String>
      mtokens: <Forwarded Millitokens String>
      outgoing_channel_id: <Outgoing Channel Id String>
      row_type: <Row Type String>
    }]
  }
*/
module.exports = ({after, before, limit, lnd, token}, cbk) => {
  return asyncAuto({
    // Validate arguments
    validate: cbk => {
      if (!lnd) {
        return cbk([400, 'ExpectedLndForInvoiceListing']);
      }

      if (!!limit && !!token) {
        return cbk([400, 'UnexpectedLimitWhenPagingInvoicesWithToken']);
      }

      return cbk();
    },

    // Get the list of forwards
    listForwards: ['validate', ({}, cbk) => {
      let offset;
      let resultsLimit = limit || defaultLimit;

      if (!!token) {
        try {
          const pagingToken = parse(token);

          offset = pagingToken.offset;
          resultsLimit = pagingToken.limit;
        } catch (err) {
          return cbk([400, 'ExpectedValidPagingToken', err, token]);
        }
      }

      return lnd.forwardingHistory({
        index_offset: offset || 0,
        num_max_events: resultsLimit,
      },
      (err, res) => {
        if (!!err) {
          return cbk([503, 'GetForwardingHistoryError', err]);
        }

        if (!res) {
          return cbk([503, 'ExpedtedForwardingHistoryResults']);
        }

        if (!Array.isArray(res.forwarding_events)) {
          return cbk([503, 'ExpectedForwardingEvents']);
        }

        if (res.last_offset_index === undefined) {
          return cbk([503, 'ExpectedLastIndexOffset', res]);
        }

        const token = stringify({
          after,
          before,
          offset: res.last_offset_index,
          limit: resultsLimit,
        });

        return cbk(null, {token, forwards: res.forwarding_events});
      });
    }],

    // Mapped forwards
    mappedForwards: ['listForwards', ({listForwards}, cbk) => {
      return asyncMap(listForwards.forwards, (forward, cbk) => {
        const creationEpochDate = parseInt(forward.timestamp, decBase);

        if (!forward.amt_in) {
          return cbk([503, 'ExpectedIncomingForwardAmount']);
        }

        if (!forward.amt_out) {
          return cbk([503, 'ExpectedOutgoingForwardAmount']);
        }

        if (!forward.chan_id_in) {
          return cbk([503, 'ExpectedForwardChannelInId']);
        }

        if (!forward.chan_id_out) {
          return cbk([503, 'ExpectedForwardChannelOutId']);
        }

        if (!forward.fee) {
          return cbk([503, 'ExpectedForwardFeeValue']);
        }

        if (!forward.timestamp) {
          return cbk([503, 'ExpectedTimestampForForwardEvent']);
        }

        return cbk(null, {
          created_at: new Date(creationEpochDate * msPerSec).toISOString(),
          fee_mtokens: forward.fee,
          incoming_channel_id: forward.chan_id_in,
          mtokens: forward.amt_out,
          outgoing_channel_id: forward.chan_id_out,
          type: rowTypes.forward,
        });
      },
      cbk);
    }],

    // Sorted forwards
    sortedForwards: [
      'listForwards',
      'mappedForwards',
      ({listForwards, mappedForwards}, cbk) =>
    {
      return cbk(null, {
        forwards: sortBy(mappedForwards, 'created_at').reverse(),
        next: !!mappedForwards.length ? listForwards.token : undefined,
      });
    }],
  },
  returnResult({of: 'sortedForwards'}, cbk));
};

