const {networks} = require('bitcoinjs-lib');

const {p2pkh} = require('./conf/address_versions');
const {p2sh} = require('./conf/address_versions');

/** Address version

  {
    network: <Network Name String>
    [prefix]: <Bech32 Prefix String>
    version: <Bitcoinjs-lib Chain Address Version Number>
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

  switch (version) {
  case networks[network].pubKeyHash:
    return {version: p2pkh};

  case networks[network].scriptHash:
    return {version: p2sh};

  default:
    throw new Error('UnexpectedVersionToDeriveBoltOnChainAddressVersion');
  }
};
