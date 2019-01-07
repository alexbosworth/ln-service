const addressFormats = require('./conf/address_formats');
const rowTypes = require('./conf/row_types');

const connectFailMessage = '14 UNAVAILABLE: Connect Failed';

/** Create a new receive address.

  {
    format: <Receive Address Type String> // "np2wpkh" || "p2wpkh"
    lnd: <LND GRPC API Object>
  }

  @returns via cbk
  {
    address: <Chain Address String>
    type: <Row Type String>
  }
*/
module.exports = ({format, lnd}, cbk) => {
  if (!format || addressFormats[format] === undefined) {
    return cbk([400, 'ExpectedKnownAddressFormat']);
  }

  if (!lnd || !lnd.newAddress) {
    return cbk([400, 'ExpectedLndForAddressCreation']);
  }

  return lnd.newAddress({type: addressFormats[format]}, (err, response) => {
    if (!!err && err.message === connectFailMessage) {
      return cbk([503, 'FailedToConnectToDaemonToCreateChainAddress', err]);
    }

    if (!!err) {
      return cbk([503, 'CreateAddressError', err]);
    }

    if (!response) {
      return cbk([503, 'ExpectedResponseForAddressCreation']);
    }

    if (!response.address) {
      return cbk([503, 'ExpectedAddressInCreateAddressResponse', response]);
    }

    return cbk(null, {
      address: response.address,
      type: rowTypes.chain_address,
    });
  });
};

