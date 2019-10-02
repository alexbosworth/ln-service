const {networks} = require('bitcoinjs-lib');

const {p2pkh} = require('./conf/address_versions');
const {p2sh} = require('./conf/address_versions');

/** Address version

  Either a prefix or a network and version is required

  {
    [network]: <Network Name String>
    [prefix]: <Bech32 Prefix String>
    [version]: <Bitcoinjs-lib Chain Address Version Number>
  }

  @throws
  <Error>

  @returns
  {
    version: <BOLT 11 Chain Address Version Number>
  }
*/
module.exports = ({network, prefix, version}) => {
  if (!!prefix) {
    return {version};
  }

  if (!network) {
    throw new Error('ExpectedNetworkToDeriveAddressVersion');
  }

  if (!networks[network]) {
    throw new Error('UnexpectedNetworkToDeriveAddressVersion');
  }

  if (version === undefined) {
    throw new Error('ExpectedVersionToDeriveAddressVersion');
  }

  switch (version) {
  case networks[network].pubKeyHash:
    return {version: p2pkh};

  case networks[network].scriptHash:
    return {version: p2sh};

  default:
    throw new Error('UnexpectedVersionToDeriveBoltOnChainAddressVersion');
  }
};
