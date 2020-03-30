const asyncAuto = require('async/auto');
const asyncMapSeries = require('async/mapSeries');
const {chanFormat} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const emptyChannelId = '0';
const notFound = -1;
const outpointDivider = ':';
const satsPerMSat = 1e3;
const transactionIdHexLength = 32 * 2;

/** Get a rundown on fees for channels

  `id` is not supported on LND 0.9.2 and below

  {
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    channels: [{
      base_fee: <Base Flat Fee in Tokens Number>
      fee_rate: <Fee Rate In Tokens Per Million Number>
      [id]: <Standard Format Channel Id String>
      transaction_id: <Channel Funding Transaction Id Hex String>
      transaction_vout: <Funding Outpoint Output Index Number>
    }]
  }
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.feeReport) {
          return cbk([400, 'ExpectedLndForFeeRatesRequest']);
        }

        return cbk();
      },

      // Query for fee rates report
      getFeeReport: ['validate', ({}, cbk) => {
        return lnd.default.feeReport({}, (err, res) => {
          if (!!err) {
            return cbk([503, 'GetFeeReportError', err]);
          }

          if (!res.channel_fees) {
            return cbk([503, 'UnexpectedFeeReportResponse', res]);
          }

          return cbk(null, res.channel_fees);
        });
      }],

      // Map fee report into fee rates and check response data
      feesForChannels: ['getFeeReport', ({getFeeReport}, cbk) => {
        return asyncMapSeries(getFeeReport, (channel, cbk) => {
          if (!channel.channel_point) {
            return cbk([503, 'ExpectedChannelPoint']);
          }

          if (channel.channel_point.indexOf(outpointDivider) === notFound) {
            return cbk([503, 'UnexpectedChannelPointFormat']);
          }

          const [txId, index] = channel.channel_point.split(outpointDivider);

          if (!txId || txId.length !== transactionIdHexLength) {
            return cbk([503, 'ExpectedChannelPointTransactionId']);
          }

          if (!index) {
            return cbk([503, 'ExpectedChannelPointIndex']);
          }

          if (!channel.base_fee_msat) {
            return cbk([503, 'ExpectedBaseFeeForChannel']);
          }

          if (!channel.fee_per_mil) {
            return cbk([503, 'ExpectedFeeRatePerMillion']);
          }

          const number = channel.chan_id;

          const hasId = number !== emptyChannelId;

          if (hasId) {
            try {
              chanFormat({number});
            } catch (err) {
              throw new Error('ExpectedNumericFormatChannelIdInFeeReport');
            }
          }

          return cbk(null, {
            base_fee: Number(channel.base_fee_msat) / satsPerMSat,
            fee_rate: Number(channel.fee_per_mil),
            id: hasId ? chanFormat({number}).channel : undefined,
            transaction_id: txId,
            transaction_vout: Number(index),
          });
        },
        cbk);
      }],

      // Final channels fee rate listing
      channels: ['feesForChannels', ({feesForChannels}, cbk) => {
        return cbk(null, {channels: feesForChannels});
      }],
    },
    returnResult({reject, resolve, of: 'channels'}, cbk));
  });
};
