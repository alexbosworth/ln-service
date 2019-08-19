const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const BN = require('bn.js');
const {chanFormat} = require('bolt07');
const {returnResult} = require('asyncjs-util');
const {sortBy} = require('lodash');

const decBase = 10;
const defaultLimit = 100;
const {isArray} = Array;
const msPerSec = 1e3;
const mtokensPerToken = new BN(1e3, 10);
const {parse} = JSON;
const {round} = Math;
const {stringify} = JSON;

/** Get forwarded payments, from oldest to newest

  When using an "after" date a "before" date is required.

  If a next token is returned, pass it to get additional page of results.

  {
    [after]: <Get Only Payments Forwarded At Or After ISO 8601 Date String>
    [before]: <Get Only Payments Forwarded Before ISO 8601 Date String>
    [limit]: <Page Result Limit Number>
    lnd: <Authenticated LND gRPC API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    forwards: [{
      created_at: <Forward Record Created At ISO 8601 Date String>
      fee: <Fee Tokens Charged Number>
      fee_mtokens: <Approximated Fee Millitokens Charged String>
      incoming_channel: <Incoming Standard Format Channel Id String>
      outgoing_channel: <Outgoing Standard Format Channel Id String>
      tokens: <Forwarded Tokens String>
    }]
    [next]: <Contine With Opaque Paging Token String>
  }
*/
module.exports = ({after, before, limit, lnd, token}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Validate arguments
      validate: cbk => {
        if (!!after && !before) {
          return cbk([400, 'ExpectedBeforeDateWhenUsingAfterDate']);
        }

        if (!lnd || !lnd.default || !lnd.default.forwardingHistory) {
          return cbk([400, 'ExpectedLndToGetForwardingHistory']);
        }

        if (!!limit && !!token) {
          return cbk([400, 'UnexpectedLimitWhenPagingForwardsWithToken']);
        }

        return cbk();
      },

      // Get the list of forwards
      listForwards: ['validate', ({}, cbk) => {
        let endTime = before || null;
        let offset;
        let resultsLimit = limit || defaultLimit;
        let start = after || null;

        if (!!token) {
          try {
            const pagingToken = parse(token);

            endTime = pagingToken.before || null;
            offset = pagingToken.offset;
            resultsLimit = pagingToken.limit;
            start = pagingToken.after || null;
          } catch (err) {
            return cbk([400, 'ExpectedValidPagingToken', {err}]);
          }
        }

        return lnd.default.forwardingHistory({
          end_time: !endTime ? null : round(new Date(endTime).getTime() / 1e3),
          index_offset: offset || 0,
          num_max_events: resultsLimit,
          start_time: !start ? null : round(new Date(start).getTime() / 1e3),
        },
        (err, res) => {
          if (!!err) {
            return cbk([503, 'GetForwardingHistoryError', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpedtedForwardingHistoryResults']);
          }

          if (!isArray(res.forwarding_events)) {
            return cbk([503, 'ExpectedForwardingEvents']);
          }

          if (res.last_offset_index === undefined) {
            return cbk([503, 'ExpectedLastIndexOffsetInForwardsResponse']);
          }

          const token = stringify({
            after: start || undefined,
            before: endTime || undefined,
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
          let incomingChannel;
          let outgoingChannel;

          if (!forward.amt_in) {
            return cbk([503, 'ExpectedIncomingForwardAmount']);
          }

          if (!forward.amt_out) {
            return cbk([503, 'ExpectedOutgoingForwardAmount']);
          }

          if (!forward.chan_id_in) {
            return cbk([503, 'ExpectedForwardChannelInId']);
          }

          try {
            incomingChannel = chanFormat({number: forward.chan_id_in}).channel;
          } catch (err) {
            return cbk([503, 'ExpectedNumericIncomingChannelId', err]);
          }

          if (!forward.chan_id_out) {
            return cbk([503, 'ExpectedForwardChannelOutId']);
          }

          try {
            const out = chanFormat({number: forward.chan_id_out});

            outgoingChannel = out.channel;
          } catch (err) {
            return cbk([503, 'ExpectedNumericOutgoingChannelId']);
          }

          if (!forward.fee) {
            return cbk([503, 'ExpectedForwardFeeValue']);
          }

          if (!forward.timestamp) {
            return cbk([503, 'ExpectedTimestampForForwardEvent']);
          }

          const fee = new BN(forward.fee, decBase);
          const feeMsat = forward.fee_msat === '0' ? 0 : forward.fee_msat;

          return cbk(null, {
            created_at: new Date(creationEpochDate * msPerSec).toISOString(),
            fee: fee.toNumber(),
            fee_mtokens: feeMsat || fee.mul(mtokensPerToken).toString(decBase),
            incoming_channel: incomingChannel,
            outgoing_channel: outgoingChannel,
            tokens: parseInt(forward.amt_out, decBase),
            type: 'forward',
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
    returnResult({reject, resolve, of: 'sortedForwards'}, cbk));
  });
};
