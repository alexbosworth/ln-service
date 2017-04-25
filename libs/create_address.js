const rowTypes = require('./../config/row_types');

/** Create a new receive address.

  {
    lnd_grpc_api: <Object>
  }

  @returns via cbk
  {
    address: <Address String>
    type: <Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api) { return cbk([500, 'Missing lnd grpc api', args]); }

  return args.lnd_grpc_api.newAddress({type: 1}, (err, response) => {
    if (!!err) { return cbk([500, 'Create address error', err]); }

    if (!response || !response.address) {
      return cbk([500, 'Expected address response', response]);
    }

    return cbk(null, {address: response.address, type: rowTypes.address});
  });
};

