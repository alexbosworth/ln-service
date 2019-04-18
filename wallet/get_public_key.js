/** Get a public key in the seed

  {
    family: <Key Family Number>
    index: <Key Index Number>
    lnd: <WalletRpc GRPC API LND Object>
  }

  @returns via cbk
  {
    public_key: <Public Key Hex String>
  }
*/
module.exports = ({family, index, lnd}, cbk) => {
  if (family === undefined) {
    return cbk([400, 'ExpectedKeyFamilyToGetPublicKey']);
  }

  if (index === undefined) {
    return cbk([400, 'ExpectedKeyIndexToGetPublicKey']);
  }

  if (!lnd || !lnd.deriveKey) {
    return cbk([400, 'ExpectedWalletRpcLndToGetPublicKey']);
  }

  return lnd.deriveKey({key_family: family, key_index: index}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingPublicKeyFromSeed']);
    }

    if (!res) {
      return cbk([503, 'UnexpectedResultInDerivePublicKeyResponse']);
    }

    if (!Buffer.isBuffer(res.raw_key_bytes)) {
      return cbk([503, 'ExpectedRawPublicKeyBytesInDerivePublicKeyResponse']);
    }

    return cbk(null, {public_key: res.raw_key_bytes.toString('hex')});
  });
};
