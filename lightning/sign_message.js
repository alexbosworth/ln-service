/** Sign a message

  {
    lnd: <LND GRPC API Object>
    message: <Message String>
  }

  @returns via cbk
  {
    signature: <Signature String>
  }
*/
module.exports = ({lnd, message}, cbk) => {
  if (!lnd || !lnd.signMessage) {
    return cbk([400, 'ExpectedLndToSignMessage']);
  }

  if (!message) {
    return cbk([400, 'ExpectedMessageToSign']);
  }

  return lnd.signMessage({msg: Buffer.from(message, 'utf8')}, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedSignMessageError', err]);
    }

    if (!res.signature) {
      return cbk([503, 'ExpectedSignatureForMessageSignRequest', res]);
    }

    return cbk(null, {signature: res.signature});
  });
};

