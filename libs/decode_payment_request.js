const _ = require('lodash');

const rowTypes = require('./../config/row_types');

const intBase = 10;
const msPerSec = 1e3;

/** Get decoded payment request

  {
    lnd_grpc_api: <Object>
    payment_request: <Serialized Payment Request String>
  }

  @returns via cbk
  {
    chain_address: <Fallback Chain Address String>
    description: <Payment Description String>
    destination_hash: <Payment Longer Description Hash String>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    tokens: <Requested Tokens Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  if (!args.payment_request) {
    return cbk([500, 'Missing payment request', args]);
  }

  return args.lnd_grpc_api.decodePayReq({
    pay_req: args.payment_request,
  },
  (err, res) => {
    if (!!err) { return cbk([500, 'Get payment request error', err]); }

    if (!res.destination) { return cbk([500, 'Expected destination', res]); }

    if (!res.payment_hash) { return cbk([500, 'Expected payment hash', res]); }

    if (!_.isFinite(parseInt(res.num_satoshis, intBase))) {
      return cbk([500, 'Expected num satoshis', res]);
    }

    const createdAt = parseInt(res.timestamp, intBase) * msPerSec;
    const expiresInMs = parseInt(res.expiry, intBase) * msPerSec;

    const expiryDateMs = createdAt + expiresInMs;

    return cbk(null, {
      chain_address: res.fallback_addr || null,
      created_at: new Date(createdAt).toISOString(),
      description: res.description,
      description_hash: res.description_hash,
      destination: res.destination,
      expires_at: !res.expiry ? null : new Date(expiryDateMs).toISOString(),
      id: res.payment_hash,
      tokens: parseInt(res.num_satoshis, intBase),
      type: rowTypes.payment_request,
    });
  });
};

