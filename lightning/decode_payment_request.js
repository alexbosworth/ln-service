const asyncAuto = require('async/auto');
const {featureFlagDetails} = require('bolt09');
const {parsePaymentRequest} = require('invoices');
const {returnResult} = require('asyncjs-util');

const {routeFromRouteHint} = require('./../routing');
const {safeTokens} = require('./../bolt00');

const bufToHex = n => !n.length ? undefined : n.toString('hex');
const defaultExpireMs = 1000 * 60 * 60;
const defaultMtokens = '0';
const {isArray} = Array;
const isHash = n => /^[0-9A-F]{64}$/i.test(n);
const msPerSec = 1e3;
const {now} = Date;

/** Get decoded payment request

  Requires `offchain:read` permission

  LND 0.8.2 and previous versions do not return `features`, `payment`

  {
    lnd: <Authenticated LND API Object>
    request: <BOLT 11 Payment Request String>
  }

  @returns via cbk or Promise
  {
    chain_address: <Fallback Chain Address String>
    [cltv_delta]: <Final CLTV Delta Number>
    description: <Payment Description String>
    description_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    features: [{
      bit: <BOLT 09 Feature Bit Number>
      is_known: <Feature is Known Bool>
      is_required: <Feature Support is Required To Pay Bool>
      type: <Feature Type String>
    }]
    id: <Payment Hash String>
    mtokens: <Requested Millitokens String>
    [payment]: <Payment Identifier Hex Encoded String>
    routes: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    safe_tokens: <Requested Tokens Rounded Up Number>
    tokens: <Requested Tokens Rounded Down Number>
  }
*/
module.exports = ({lnd, request}, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        if (!lnd || !lnd.default || !lnd.default.decodePayReq) {
          return cbk([400, 'ExpectedLndForDecodingPaymentRequest']);
        }

        if (!request) {
          return cbk([400, 'ExpectedPaymentRequestToDecode']);
        }

        return cbk();
      },

      // Get payment request values
      values: ['validate', ({}, cbk) => {
        try {
          // Native parsing is used to get millitokens in LND 0.8.2 and prior
          const parsed = parsePaymentRequest({request});

          return cbk(null, parsed);
        } catch (err) {
          return cbk([503, 'FailedToParsePaymentRequest', {err}]);
        }
      }],

      // Decode payment request
      decode: ['values', ({values}, cbk) => {
        return lnd.default.decodePayReq({pay_req: request}, (err, res) => {
          if (!!err) {
            return cbk([503, 'UnexpectedDecodePaymentRequestError', {err}]);
          }

          if (!res.destination) {
            return cbk([503, 'ExpectedDestinationInDecodedPaymentRequest']);
          }

          if (!res.expiry) {
            return cbk([503, 'ExpectedPaymentReqExpirationInDecodedPayReq']);
          }

          if (!res.payment_hash || !isHash(res.payment_hash)) {
            return cbk([503, 'ExpectedPaymentHashFromDecodePayReqResponse']);
          }

          if (!res.num_satoshis) {
            return cbk([503, 'ExpectedNumSatoshis', res]);
          }

          if (!isArray(res.route_hints)) {
            return cbk([503, 'ExpectedRouteHintsArray']);
          }

          try {
            res.route_hints.forEach(route => routeFromRouteHint({
              destination: res.destination,
              hop_hints: route.hop_hints,
            }));
          } catch (err) {
            return cbk([503, 'ExpectedValidRouteHintsInPaymentReq', {err}]);
          }

          if (!res.timestamp) {
            return cbk([503, 'ExpectedPaymentRequestTimestamp', res]);
          }

          const createdAtMs = Number(res.timestamp) * msPerSec;
          const expiresInMs = Number(res.expiry) * msPerSec;

          const expiryDateMs = createdAtMs + (expiresInMs || defaultExpireMs);

          // LND versions 0.8.2 and below do not return precision
          const mtokens = res.num_msat !== '0' ? res.num_msat : values.mtokens;

          return cbk(null, {
            chain_address: res.fallback_addr || undefined,
            cltv_delta: Number(res.cltv_expiry || 0) || undefined,
            created_at: new Date(createdAtMs).toISOString(),
            description: res.description,
            description_hash: res.description_hash || undefined,
            destination: res.destination,
            expires_at: new Date(expiryDateMs).toISOString(),
            features: Object.keys(res.features).map(bit => ({
              bit: Number(bit),
              is_known: res.features[bit].is_known,
              is_required: res.features[bit].is_required,
              type: featureFlagDetails({bit}).type,
            })),
            id: res.payment_hash,
            is_expired: now() > expiryDateMs,
            mtokens: mtokens || defaultMtokens,
            payment: bufToHex(res.payment_addr) || undefined,
            routes: res.route_hints.map(route => routeFromRouteHint({
              destination: res.destination,
              hop_hints: route.hop_hints,
            })),
            safe_tokens: safeTokens({mtokens: mtokens || defaultMtokens}).safe,
            tokens: Number(res.num_satoshis),
          });
        });
      }],
    },
    returnResult({reject, resolve, of: 'decode'}, cbk));
  });
};
