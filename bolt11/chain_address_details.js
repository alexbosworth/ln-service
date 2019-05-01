const {address} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');

const addressVersion = require('./address_version');

const base58 = n => { try { return address.fromBase58Check(n); } catch (e) {}};
const bech32 = n => { try { return address.fromBech32(n); } catch (e) {}};

/** Derive chain address details

  {
    address: <Chain Address String>
    network: <Network Name String>
  }

  @throws
  <Error> on invalid chain address

  @returns
  {
    hash: <Address Data Hash Hex String>
    version: <Witness or Address Version Number>
  }
*/
module.exports = ({address, network}) => {
  if (!address) {
    throw new Error('ExpectedAddressToDeriveChainAddressDetails');
  }

  if (!network || !networks[network]) {
    throw new Error('ExpectedNetworkToDeriveChainAddressDetails');
  }

  const details = base58(address) || bech32(address);

  // Exit early: address does not parse as a bech32 or base58 address
  if (!details) {
    throw new Error('ExpectedValidAddressToDeriveChainDetails');
  }

  const {prefix} = details;
  const {version} = details;

  return {
    hash: (details.data || details.hash).toString('hex'),
    version: addressVersion({network, prefix, version}).version,
  };
};
