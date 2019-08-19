const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const hexToBuffer = hex => Buffer.from(hex, 'hex');
const {isArray} = Array;

/** Verify a set of aggregated channel backups

  {
    backup: <Multi-Backup Hex String>
    channels: [{
      transaction_id: <Funding Transaction Id Hex String>
      transaction_vout: <Funding Transaction Output Index Number>
    }]
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    is_valid: <Backup is Valid Bool>
  }
*/
module.exports = ({backup, channels, lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!backup || !isHex(backup)) {
          return cbk([400, 'ExpectedMultiChannelBackupToVerify']);
        }

        if (!isArray(channels)) {
          return cbk([400, 'ExpectedChannelsToVerifyInMultiBackup']);
        }

        if (!lnd || !lnd.default || !lnd.default.verifyChanBackup) {
          return cbk([400, 'ExpectedAuthenticatedLndToVerifyChanBackup']);
        }

        const invalidChannel = channels.find(chan => {
          return !chan.transaction_id || chan.transaction_vout === undefined;
        });

        if (!!invalidChannel) {
          return cbk([400, 'ExpectedChannelOutpointsToVerifyBackups']);
        }

        return cbk();
      },

      // Verify backups
      verify: ['validate', ({}, cbk) => {
        return lnd.default.verifyChanBackup({
          multi_chan_backup: {
            chan_points: channels.map(chan => ({
              funding_txid_bytes: hexToBuffer(chan.transaction_id).reverse(),
              output_index: chan.transaction_vout,
            })),
            multi_chan_backup: Buffer.from(backup, 'hex'),
          },
        },
        err => {
          if (!!err) {
            return cbk(null, {is_valid: false});
          }

          return cbk(null, {is_valid: true});
        });
      }],
    },
    returnResult({reject, resolve, of: 'verify'}, cbk));
  });
};
