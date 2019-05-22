/** Verify a message was signed by a known pubkey

  {
    lnd: <Authenticated LND gRPC API Object>
    message: <Message String>
    signature: <Signature String>
  }

  @returns via cbk
  {
    [signed_by]: <Public Key String>
  }
*/
module.exports = ({lnd, message, signature}, cbk) => {
  if (!lnd || !lnd.default || !lnd.default.verifyMessage) {
    return cbk([400, 'ExpectedLndForVerifyMessage']);
  }

  if (!message) {
    return cbk([400, 'ExpectedMessageToVerify']);
  }

  if (!signature) {
    return cbk([400, 'ExpectedSignatureToVerifyAgainst']);
  }

  const msg = Buffer.from(message, 'utf8');

  return lnd.default.verifyMessage({msg, signature}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedVerifyMessageError', {err}]);
    }

    if (!res.pubkey) {
      return cbk([503, 'ExpectedPublicKeyInVerifyMessageResponse']);
    }

    if (!res.valid) {
      return cbk(null, {});
    }

    return cbk(null, {signed_by: res.pubkey});
  });
};
