const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

/** Delete all forwarding reputations

  Requires LND built with routerrpc build tag

  {
    lnd: <Authenticated gRPC LND API Object>
  }

  @returns via cbk or Promise
*/
module.exports = ({lnd}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.router) {
          return cbk([400, 'ExpectedLndToDeleteForwardingReputations']);
        }

        return cbk();
      },

      // Delete reputations
      deleteReputations: ['validate', ({}, cbk) => {
        return lnd.router.resetMissionControl({}, err => {
          if (!!err) {
            return cbk([503, 'UnexpectedErrorResettingMissionControl', {err}]);
          }

          return cbk();
        });
      }],
    },
    returnResult({reject, resolve}, cbk));
  });
};
