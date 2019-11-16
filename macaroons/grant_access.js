const asyncAuto = require('async/auto');
const isHex = require('is-hex');
const {returnResult} = require('asyncjs-util');

const {isLnd} = require('./../grpc');
const permissions = require('./permissions');

const {keys} = Object;
const notFound = -1;
const notSupported = 'unknown service lnrpc.Lightning';

/** Give access to the node by making a macaroon access credential

  Note: granting access is not supported in LND versions 0.8.1 and below

  Note: access once given cannot be revoked

  {
    [is_ok_to_create_chain_addresses]: <Can Make New Addresses Bool>
    [is_ok_to_create_invoices]: <Can Create Lightning Invoices Bool>
    [is_ok_to_create_macaroons]: <Can Create Macaroons Bool>
    [is_ok_to_adjust_peers]: <Can Add or Remove Peers Bool>
    [is_ok_to_get_chain_transactions]: <Can See Chain Transactions Bool>
    [is_ok_to_get_invoices]: <Can See Invoices Bool>
    [is_ok_to_get_wallet_info]: <Can General Graph and Wallet Information Bool>
    [is_ok_to_get_payments]: <Can Get Historical Lightning Transactions Bool>
    [is_ok_to_get_peers]: <Can Get Node Peers Information Bool>
    [is_ok_to_pay]: <Can Send Funds or Edit Lightning Payments Bool>
    [is_ok_to_send_to_chain_addresses]: <Can Send Coins On Chain Bool>
    [is_ok_to_sign_messages]: <Can Sign Messages From Node Key Bool>
    [is_ok_to_stop_daemon]: <Can Terminate Node or Change Operation Mode Bool>
    [is_ok_to_verify_messages]: <Can Verify Messages From Node Keys Bool>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk or Promise
  {
    macaroon: <Base64 Encoded Macaroon String>
  }
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!keys(args).length) {
          return cbk([400, 'ExpectedAccessPrivilegeToGrantAccessCredential']);
        }

        if (!isLnd({lnd: args.lnd, method: 'bakeMacaroon', type: 'default'})) {
          return cbk([400, 'ExpectedLndToGrantAccessCredential']);
        }

        return cbk();
      },

      // Permissions to grant
      permissions: ['validate', ({}, cbk) => {
        const access = keys(permissions).filter(n => !!args[permissions[n]]);

        return cbk(null, access.map(permission => {
          const [entity, action] = permission.split(':');

          return {action, entity};
        }));
      }],

      // Make macaroon
      createMacaroon: ['permissions', ({permissions}, cbk) => {
        return args.lnd.default.bakeMacaroon({permissions}, (err, res) => {
          if (!!err && err.details === notSupported) {
            return cbk([503, 'GrantAccessMethodNotSupported']);
          }

          if (!!err) {
            return cbk([503, 'UnexpectedErrorFromBakeMacaroon', {err}]);
          }

          if (!res) {
            return cbk([503, 'ExpectedResponseFromBackMacaroonRequest']);
          }

          if (!isHex(res.macaroon)) {
            return cbk([503, 'ExpectedHexSerializedMacaroonCredentials']);
          }

          const macaroon = Buffer.from(res.macaroon, 'hex').toString('base64');

          return cbk(null, {macaroon});
        });
      }],
    },
    returnResult({reject, resolve, of: 'createMacaroon'}, cbk));
  });
};
