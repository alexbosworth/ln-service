const BN = require('bn.js');
const {rawChanId} = require('bolt07');

const endian = 'be';

/** Hop as raw hop hint hex data

  {
    base_fee_mtokens: <Base Fee Millitokens String>
    channel: <Standard Format Channel Id String>
    cltv_delta: <Final CLTV Expiration Blocks Delta Number>
    fee_rate: <Fee Rate Millitokens Per Million Number>
    public_key: <Forward Edge Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    hex: <Raw Hop Encoding Hex String>
  }
*/
module.exports = args => {
  if (!args.base_fee_mtokens) {
    throw new Error('ExpectedBaseFeeMillitokensToConvertHopToHex');
  }

  if (!args.channel) {
    throw new Error('ExpectedChannelToConvertHopToHex');
  }

  if (!args.cltv_delta) {
    throw new Error('ExpectedCltvDeltaToConvertHopToHex');
  }

  if (args.fee_rate === undefined) {
    throw new Error('ExpectedHopFeeRateToConvertHopToHex');
  }

  if (!args.public_key) {
    throw new Error('ExpectedHopPublicKeyToConvertHopToHex');
  }

  const encoded = Buffer.concat([
    Buffer.from(args.public_key, 'hex'),
    Buffer.from(rawChanId({channel: args.channel}).id, 'hex'),
    new BN(args.base_fee_mtokens).toArrayLike(Buffer, endian, 4),
    new BN(args.fee_rate).toArrayLike(Buffer, endian, 4),
    new BN(args.cltv_delta).toArrayLike(Buffer, endian, 2),
  ]);

  return {hex: encoded.toString('hex')};
};
