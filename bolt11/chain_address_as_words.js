const chainAddressDetails = require('./chain_address_details');
const hexAsWords = require('./hex_as_words');

/** Convert chain address to bech32 words

  {
    address: <Chain Address String>
    network: <Network Name String>
  }

  @returns
  {
    words: [<Chain Address Word Number>]
  }
*/
module.exports = ({address, network}) => {
  if (!address) {
    throw new Error('ExpectedAddressToGetWordsForChainAddress');
  }

  if (!network) {
    throw new Error('ExpectedNetworkToGetWordsForChainAddress');
  }

  const {hash, version} = chainAddressDetails({address, network});

  return {words: [version].concat(hexAsWords({hex: hash}).words)};
};
