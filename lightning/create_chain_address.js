const addressFormats = require('./conf/address_formats');
const rowTypes = require('./conf/row_types');

const connectFailMessage = '14 UNAVAILABLE: Connect Failed';

/** Create a new receive address.

  {
    format: <Receive Address Type String> // "np2wpkh" || "p2wpkh"
    [is_unused]: <Get As-Yet Unused Address Bool>
    lnd: <Authenticated LND gRPC API Object>
  }

  @returns via cbk
  {
    address: <Chain Address String>
    type: <Row Type String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.format || addressFormats[args.format] === undefined) {
    return cbk([400, 'ExpectedKnownAddressFormat']);
  }

  if (!args.lnd || !args.lnd.default || !args.lnd.default.newAddress) {
    return cbk([400, 'ExpectedLndForAddressCreation']);
  }

  const type = addressFormats[(!args.is_unused ? '': 'unused_') + args.format];

  return args.lnd.default.newAddress({type}, (err, res) => {
    if (!!err && err.message === connectFailMessage) {
      return cbk([503, 'FailedToConnectToDaemonToCreateChainAddress', err]);
    }

    if (!!err) {
      return cbk([503, 'CreateAddressError', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResponseForAddressCreation']);
    }

    if (!res.address) {
      return cbk([503, 'ExpectedAddressInCreateAddressResponse']);
    }

    return cbk(null, {address: res.address, type: rowTypes.chain_address});
  });
};
