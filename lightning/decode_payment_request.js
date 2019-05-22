const {isFinite} = require('lodash');
const isHex = require('is-hex');

const {routeFromRouteHint} = require('./../routing');
const rowTypes = require('./conf/row_types');

const decBase = 10;
const defaultExpirationMs = 1000 * 60 * 60;
const {isArray} = Array;
const msPerSec = 1e3;
const {now} = Date;

/** Get decoded payment request

  {
    lnd: <Authenticated LND gRPC API Object>
    request: <BOLT 11 Payment Request String>
  }

  @returns via cbk
  {
    chain_address: <Fallback Chain Address String>
    [cltv_delta]: <Final CLTV Delta Number>
    description: <Payment Description String>
    destination_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Hash String>
    routes: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    tokens: <Requested Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = ({lnd, request}, cbk) => {
  if (!lnd || !lnd.default || !lnd.default.decodePayReq) {
    return cbk([400, 'ExpectedLndForDecodingPaymentRequest']);
  }

  if (!request) {
    return cbk([400, 'ExpectedPaymentRequestToDecode']);
  }

  return lnd.default.decodePayReq({pay_req: request}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedDecodePaymentRequestError', {err}]);
    }

    if (!res.destination) {
      return cbk([503, 'ExpectedDestinationInDecodedPaymentRequest']);
    }

    if (!res.expiry) {
      return cbk([503, 'ExpectedPaymentRequestExpirationInDecodedPayReq']);
    }

    if (!res.payment_hash || !isHex(res.payment_hash)) {
      return cbk([503, 'ExpectedPaymentHashFromDecodePayReqResponse']);
    }

    if (!isFinite(parseInt(res.num_satoshis, decBase))) {
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
      return cbk([503, 'ExpectedValidRouteHintsInPaymentRequest', {err}]);
    }

    if (!res.timestamp) {
      return cbk([503, 'ExpectedPaymentRequestTimestamp', res]);
    }

    const createdAtMs = parseInt(res.timestamp, decBase) * msPerSec;
    const expiresInMs = parseInt(res.expiry, decBase) * msPerSec;

    const expiryDateMs = createdAtMs + (expiresInMs || defaultExpirationMs);

    return cbk(null, {
      chain_address: res.fallback_addr || undefined,
      cltv_delta: parseInt(res.cltv_delta || 0, decBase) || undefined,
      created_at: new Date(createdAtMs).toISOString(),
      description: res.description,
      description_hash: res.description_hash || undefined,
      destination: res.destination,
      expires_at: new Date(expiryDateMs).toISOString(),
      id: res.payment_hash,
      is_expired: now() > expiryDateMs,
      routes: res.route_hints.map(route => routeFromRouteHint({
        destination: res.destination,
        hop_hints: route.hop_hints,
      })),
      tokens: parseInt(res.num_satoshis, decBase),
      type: rowTypes.payment_request,
    });
  });
};
