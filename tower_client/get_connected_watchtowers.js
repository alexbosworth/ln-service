const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {unimplementedError} = require('./constants');

const {isArray} = Array;

/** Get a list of connected watchtowers and watchtower info

  Includes previously connected watchtowers

  Requires LND built with `wtclientrpc` build tag

  Requires `offchain:read` permission

  `is_anchor` flag is not supported on LND 0.11.1 and below

  {
    [is_anchor]: <Get Anchor Type Tower Info Bool>
    lnd: <Authenticated LND API Object>
  }

  @returns via cbk or Promise
  {
    max_session_update_count: <Maximum Updates Per Session Number>
    sweep_tokens_per_vbyte: <Sweep Tokens per Virtual Byte Number>
    backups_count: <Total Backups Made Count Number>
    failed_backups_count: <Total Backup Failures Count Number>
    finished_sessions_count: <Finished Updated Sessions Count Number>
    pending_backups_count: <As Yet Unacknowledged Backup Requests Count Number>
    sessions_count: <Total Backup Sessions Starts Count Number>
    towers: [{
      is_active: <Tower Can Be Used For New Sessions Bool>
      public_key: <Identity Public Key Hex String>
      sessions: [{
        backups_count: <Total Successful Backups Made Count Number>
        max_backups_count: <Backups Limit Number>
        pending_backups_count: <Backups Pending Acknowledgement Count Number>
        sweep_tokens_per_vbyte: <Fee Rate in Tokens Per Virtual Byte Number>
      }]
      sockets: [<Tower Network Address IP:Port String>]
    }]
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!args.lnd || !args.lnd.tower_client) {
          return cbk([400, 'ExpectedAuthenticatedLndToGetWatchtowerInfo']);
        }

        return cbk();
      },

      // Get policy
      getPolicy: ['validate', ({}, cbk) => {
        return args.lnd.tower_client.policy({
          policy_type: !!args.is_anchor ? 'ANCHOR' : 'LEGACY',
        },
        (err, res) => {
          if (!!err && err.message === unimplementedError) {
            return cbk([503, 'ExpectedWatchtowerClientLndToGetPolicy']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingWatchtowerPolicy', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultForWatchtowerPolicy']);
          }

          if (res.max_updates === undefined) {
            return cbk([503, 'ExpectedMaxUpdateCountInWatchtowerPolicyInfo']);
          }

          if (res.sweep_sat_per_byte === undefined) {
            return cbk([503, 'ExpectedSweepSatsPerByteInWatchtowerPolicy']);
          }

          return cbk(null, {
            max_session_update_count: res.max_updates,
            sweep_tokens_per_vbyte: res.sweep_sat_per_byte,
          });
        });
      }],

      // Get stats
      getStats: ['validate', ({}, cbk) => {
        return args.lnd.tower_client.stats({}, (err, res) => {
          if (!!err && err.message === unimplementedError) {
            return cbk([503, 'ExpectedWatchtowerClientLndToGetStats']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingWatchtowerStats', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultForWatchtowerStats']);
          }

          if (res.num_backups === undefined) {
            return cbk([503, 'ExpectedBackupsCountInWatchtowerStats']);
          }

          if (res.num_failed_backups === undefined) {
            return cbk([503, 'ExpectedFailedBackupsCountInWatchtowerStats']);
          }

          if (res.num_pending_backups === undefined) {
            return cbk([503, 'ExpectedPendingBackupsCountInWatchtowerStats']);
          }

          if (res.num_sessions_acquired === undefined) {
            return cbk([503, 'ExpectedSessionsCountInWatchtowerStats']);
          }

          if (res.num_sessions_exhausted === undefined) {
            return cbk([503, 'ExpectedExhaustedSessionsCountInTowerStats']);
          }

          return cbk(null, {
            backups_count: res.num_backups,
            failed_backups_count: res.num_failed_backups,
            finished_sessions_count: res.num_sessions_exhausted,
            pending_backups_count: res.num_pending_backups,
            sessions_count: res.num_sessions_acquired,
          });
        });
      }],

      // Get towers
      getTowers: ['validate', ({}, cbk) => {
        return args.lnd.tower_client.listTowers({
          include_sessions: true,
        },
        (err, res) => {
          if (!!err && err.message === unimplementedError) {
            return cbk([503, 'ExpectedWatchtowerClientLndToGetTowers']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorGettingWatchtowersList', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResultForWatchtowerListing']);
          }

          if (!isArray(res.towers)) {
            return cbk([503, 'ExpectedArrayOfTowersForWatchtowerListing']);
          }

          if (!!res.towers.find(n => !Buffer.isBuffer(n.pubkey))) {
            return cbk([503, 'ExpectedPublicKeyForWatchtower']);
          }

          if (!!res.towers.find(n => !isArray(n.addresses))) {
            return cbk([503, 'ExpectedAddressesForWatchtower']);
          }

          const towers = res.towers.map(tower => ({
            is_active: tower.active_session_candidate,
            public_key: tower.pubkey.toString('hex'),
            sessions: (tower.sessions || []).map(session => ({
              backups_count: session.num_backups,
              max_backups_count: session.max_backups,
              pending_backups_count: session.num_pending_backups,
              sweep_tokens_per_vbyte: session.sweep_sat_per_byte,
            })),
            sockets: tower.addresses,
          }));

          return cbk(null, {towers});
        });
      }],

      // Connected watchtowers
      watchtowers: [
        'getPolicy',
        'getStats',
        'getTowers',
        ({getPolicy, getStats, getTowers}, cbk) =>
      {
        return cbk(null, {
          backups_count: getStats.backups_count,
          failed_backups_count: getStats.failed_backups_count,
          finished_sessions_count: getStats.finished_sessions_count,
          max_session_update_count: getPolicy.max_session_update_count,
          pending_backups_count: getStats.pending_backups_count,
          sessions_count: getStats.sessions_count,
          sweep_tokens_per_vbyte: getPolicy.sweep_tokens_per_vbyte,
          towers: getTowers.towers,
        });
      }],
    },
    returnResult({reject, resolve, of: 'watchtowers'}, cbk));
  });
};
