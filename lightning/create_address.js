const rowTypes = require('./conf/row_types');

/** Create a new receive address.

  {
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    address: <Address String>
    type: <Type String>
  }
*/
module.exports = ({lnd}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  return lnd.newAddress({type: 1}, (err, response) => {
    if (!!err) {
      return cbk([503, 'CreateAddressError', err]);
    }

    if (!response || !response.address) {
      return cbk([503, 'ExpectedAddressResponse', response]);
    }

    return cbk(null, {address: response.address, type: rowTypes.address});
  });
};

