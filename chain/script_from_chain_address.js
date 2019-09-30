const {address} = require('bitcoinjs-lib');
const {payments} = require('bitcoinjs-lib');

const {fromBase58Check} = address;
const {fromBech32} = address;
const {p2pkh} = payments;
const {p2sh} = payments;
const p2wpkhAddressLength = 20;
const {p2wpkh} = payments;
const {p2wsh} = payments;
const p2wshAddressLength = 32;

/** Derive output script from on-chain address

  {
    [bech32_address]: <Address String>
    [p2pkh_address]: <Address String>
    [p2sh_address]: <Address String>
  }

  @returns
  {
    [script]: <Output Script Hex String>
  }
*/
module.exports = args => {
  if (!args.bech32_address && !args.p2pkh_address && !args.p2sh_address) {
    return {};
  }

  if (!!args.p2pkh_address) {
    try {
      const {hash} = fromBase58Check(args.p2pkh_address);

      return {script: p2pkh({hash}).output.toString('hex')};
    } catch (err) {
      return {};
    }
  }

  if (!!args.p2sh_address) {
    try {
      const {hash} = fromBase58Check(args.p2sh_address);

      return {script: p2sh({hash}).output.toString('hex')};
    } catch (err) {
      return {};
    }
  }

  try {
    const {data} = fromBech32(args.bech32_address);

    switch (data.length) {
    case p2wpkhAddressLength:
      return {script: p2wpkh({hash: data}).output.toString('hex')};

    case p2wshAddressLength:
      return {script: p2wsh({hash: data}).output.toString('hex')};

    default:
      break;
    }
  } catch (err) {
    // Ignore errors
  }

  return {};
};
