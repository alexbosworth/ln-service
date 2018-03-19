/** Verify a message was signed by a known pubkey

  {
    lnd: <LND GRPC API Object>
    message: <Message String>
    signature: <Signature String>
  }

  @returns via cbk
  {
    [signed_by]: <Public Key String>
  }
*/
module.exports = ({lnd, message, signature}, cbk) => {
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!message) {
    return cbk([400, 'ExpectedMessage']);
  }

  if (!signature) {
    return cbk([400, 'ExpectedSignature']);
  }

  const msg = Buffer.from(message);

  return lnd.verifyMessage({msg, signature}, (err, res) => {
    if (!!err) {
      return cbk([500, 'UnexpectedVerifyMessageError', err]);
    }

    if (!res.pubkey) {
      return cbk([500, 'ExpectedPublicKey', res]);
    }

    if (!res.valid) {
      return cbk(null, {});
    }

    return cbk(null, {signed_by: res.pubkey});
  });
};

