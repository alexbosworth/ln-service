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
  return new Promise((resolve, reject) => {
    if (!lnd) {
      reject([500, 'ExpectedLnd']);
    } else {
      lnd.newAddress({type: 1}, (err, response) => {
        if (!!err) {
          reject([503, 'CreateAddressError', err]);
        } else if (!response || !response.address) {
          reject([503, 'ExpectedAddressResponse', response]);
        } else {
          resolve({address: response.address, type: rowTypes.address});
        }
      });
    }
  });
};

