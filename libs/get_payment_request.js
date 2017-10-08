const _ = require('lodash');
const asyncAuto = require('async/auto');

const decodePaymentRequest = require('./decode_payment_request');
const getWalletInfo = require('./get_wallet_info');
const lookupInvoice = require('./lookup_invoice');

const rowTypes = require('./../config/row_types');

/** Get payment request

  {
    lnd_grpc_api: <Object>
    payment_request: <Serialized Payment Request String>
  }

  @returns via cbk
  {
    confirmed: <Settled Bool>
    destination: <Public Key String>
    expires_at: <ISO 8601 Date String>
    id: <Payment Request Hash String>
    tokens: <Token Amount Number>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) {
    return cbk([500, 'Missing lnd grpc api', args]);
  }

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

    getWalletInfo: (cbk) => {
      return getWalletInfo({lnd_grpc_api: args.lnd_grpc_api}, cbk);
    },

    getPaymentConfirmationStatus: [
      'decodedPaymentRequest',
      'getWalletInfo',
      (res, cbk) =>
    {
      const paymentPublicKey = res.decodedPaymentRequest.destination;

      // Exit early when no information on the payment request is available.
      if (res.getWalletInfo.public_key !== paymentPublicKey) {
        return cbk(null, {});
      }

      return lookupInvoice({
        id: res.decodedPaymentRequest.id,
        lnd_grpc_api: args.lnd_grpc_api,
      },
      cbk);
    }]
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, {
      confirmed: !!res.getPaymentConfirmationStatus.settled,
      description: res.decodedPaymentRequest.description,
      destination: res.decodedPaymentRequest.destination,
      expires_at: res.decodedPaymentRequest.expires_at,
      id: res.decodedPaymentRequest.id,
      tokens: res.decodedPaymentRequest.tokens,
      type: res.decodedPaymentRequest.type,
    });
  });
};

