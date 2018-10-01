const {isFinite} = require('lodash');

const rowTypes = require('./conf/row_types');

const decBase = 10;
const defaultExp = 1000 * 60 * 60;
const msPerSec = 1e3;

/** Get decoded payment request

  {
    lnd: <LND GRPC API Object>
    request: <BOLT 11 Payment Request String>
  }

  @returns via cbk
  {
    chain_address: <Fallback Chain Address String>
    description: <Payment Description String>
    destination_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Hash String>
    routes: [{
      base_fee_mtokens: <Base Routing Fee In Millitokens Number>
      channel_id: <Channel Id String>
      cltv_delta: <CLTV Blocks Delta Number>
      fee_rate: <Fee Rate In Millitokens Per Million Number>
      public_key: <Public Key Hex String>
    }]
    tokens: <Requested Tokens Number>
    type: <Row Type String>
  }
*/
module.exports = ({lnd, request}, cbk) => {
  if (!lnd || !lnd.decodePayReq) {
    return cbk([400, 'ExpectedLndForDecodingPaymentRequest']);
  }

  if (!request) {
    return cbk([400, 'ExpectedPaymentRequestToDecode']);
  }

  return lnd.decodePayReq({pay_req: request}, (err, res) => {
    if (!!err) {
      return cbk([503, 'DecodePayReqErr', err]);
    }

    if (!res.destination) {
      return cbk([503, 'ExpectedDestination', res]);
    }

    if (!res.expiry) {
      return cbk([503, 'ExpectedPaymentRequestExpiration', res]);
    }

    if (!res.payment_hash) {
      return cbk([503, 'ExpectedPaymentHash', res]);
    }

    if (!isFinite(parseInt(res.num_satoshis, decBase))) {
      return cbk([503, 'ExpectedNumSatoshis', res]);
    }

    if (!Array.isArray(res.route_hints)) {
      return cbk([503, 'ExpectedRouteHintsArray']);
    }

    if (!res.timestamp) {
      return cbk([503, 'ExpectedPaymentRequestTimestamp', res]);
    }

    const createdAtMs = parseInt(res.timestamp, decBase) * msPerSec;
    const expiresInMs = parseInt(res.expiry, decBase) * msPerSec || defaultExp;

    const expiryDateMs = createdAtMs + expiresInMs;

    let routes;

    try {
      routes = res.route_hints.map(route => {
        if (!Array.isArray(route.hop_hints)) {
          throw new Error('ExpectedRouteHopHints');
        }

        return route.hop_hints.map(hop => {
          if (!hop.chan_id) {
            throw new Error('ExpectedRouteHopChannelId');
          }

          if (hop.cltv_expiry_delta === undefined) {
            throw new Error('ExpectedRouteHopCltvExpiryDelta');
          }

          if (!hop.fee_base_msat) {
            throw new Error('ExpectedRouteHopBaseFee');
          }

          if (hop.fee_proportional_millionths === undefined) {
            throw new Error('ExpectedRouteHopFeeRate');
          }

          if (!hop.node_id) {
            throw new Error('ExpectedRouteHopPublicKey');
          }

          return {
            base_fee_mtokens: hop.fee_base_msat,
            channel_id: hop.chan_id,
            cltv_delta: hop.cltv_expiry_delta,
            fee_rate: hop.fee_proportional_millionths,
            public_key: hop.node_id,
          };
        });
      });
    } catch (err) {
      return cbk([503, err.message, res]);
    }

    return cbk(null, {
      routes,
      chain_address: res.fallback_addr || undefined,
      created_at: new Date(createdAtMs).toISOString(),
      description: res.description,
      description_hash: res.description_hash,
      destination: res.destination,
      expires_at: new Date(expiryDateMs).toISOString(),
      id: res.payment_hash,
      minimum_final_htlc_cltv_delta: res.cltv_expiry || undefined,
      tokens: parseInt(res.num_satoshis, decBase),
      type: rowTypes.payment_request,
    });
  });
};

