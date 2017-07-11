const _ = require('lodash');
const asyncAuto = require('async/auto');

const decodePaymentRequest = require('./decode_payment_request');

const rowTypes = require('./../config/row_types');

/** Get payment request

  {
    lnd_grpc_api: <Object>
    payment_request: <Serialized Payment Request String>
  }

  @returns via cbk
  {
    destination: <Public Key String>
    id: <Payment Request Hash String>
    tokens: <Token Amount Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  if (!args.payment_request) {
    return cbk([500, 'Missing payment request', args]);
  }

  return asyncAuto({
    decodedPaymentRequest: (cbk) => {
      return decodePaymentRequest({
        lnd_grpc_api: args.lnd_grpc_api,
        payment_request: args.payment_request,
      },
      cbk);
    },
  },
  (err, res) => {
    if (!!err) { return cbk(err); }

    return cbk(null, {
      confirmed: false, // FIXME: - make this real
      destination: res.decodedPaymentRequest.destination,
      id: res.decodedPaymentRequest.id,
      tokens: res.decodedPaymentRequest.tokens,
      type: res.decodedPaymentRequest.type,
    });
  });
};

