const {address} = require('bitcoinjs-lib');
const {networks} = require('bitcoinjs-lib');

const wordsAsBuffer = require('./words_as_buffer');

const versionByteLength = 1;

/** Words as an address

  {
    network: <Network Name String>
    words: [<Word Number>]
  }

  @throws
  <Error> on invalid address data

  @returns
  <Chain Address String>
*/
module.exports = ({network, words}) => {
  if (!networks[network]) {
    throw new Error('ExpectedValidNetwork');
  }

  if (!Array.isArray(words)) {
    throw new Error('ExpectedWords');
  }

  let addressHash;
  const [version] = words;

  const dataWords = words.slice(versionByteLength);

  try {
    addressHash = wordsAsBuffer({trim: true, words: dataWords});
  } catch (e) {
    throw new Error('InvalidAddressData');
  }

  switch (version) {
  case 0: // Bech32
    return address.toBech32(addressHash, version, networks[network].bech32);
    break;

  case 17: // P2PKH
    return address.toBase58Check(addressHash, networks[network].pubKeyHash);
    break;

  case 18: // P2SH
    return address.toBase58Check(addressHash, networks[network].scriptHash);
    break;

  default:
    throw new Error('UnexpectedAddressVersion');
  }
};

