const {address} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');

const addressVersions = require('./conf/address_versions');
const wordsAsBuffer = require('./words_as_buffer');

const {toBase58Check} = address;
const {toBech32} = address;

/** Words as a chain address

  {
    network: <Network Name String>
    words: [<Bech 32 Word Number>]
  }

  @throws
  <Error>

  @returns
  {
    [chain_address]: <Chain Address String>
  }
*/
module.exports = ({network, words}) => {
  if (!Array.isArray(words) || !words.length) {
    throw new Error('ExpectedWordsToConvertToChainAddress');
  }

  let hash;
  const net = networks[network];
  const [version, ...hashWords] = words;

  if (!net) {
    throw new Error('UnrecognizedNetworkForChainAddress');
  }

  try {
    hash = wordsAsBuffer({words: hashWords, trim: true});
  } catch (err) {
    throw new Error('FailedToConvertChainAddressWordsToBuffer');
  }

  switch (version) {
  case addressVersions.p2pkh:
    return {chain_address: toBase58Check(hash, net.pubKeyHash)};

  case addressVersions.p2sh:
    return {chain_address: toBase58Check(hash, net.scriptHash)};

  case addressVersions.witnessV0:
    return {chain_address: toBech32(hash, version, net.bech32)};

  default:
    return {};
  }
};

