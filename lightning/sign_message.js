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
  if (!lnd) {
    return cbk([500, 'ExpectedLnd']);
  }

  if (!message) {
    return cbk([500, 'ExpectedMessageToSign']);
  }

  return lnd.signMessage({msg: Buffer.from(message)}, (err, res) => {
    if (!!err) {
      return cbk([500, 'UnexpectedSignMessageError', err]);
    }

    if (!res.signature) {
      return cbk([500, 'ExpectedSignature', res]);
    }

    return cbk(null, {signature: res.signature});
  });
};

