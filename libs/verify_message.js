/** Verify a message was signed by a known pubkey

  {
    lnd_grpc_api: <Object>
    message: <Message String>
    signature: <Signature String>
  }

  {
    [signed_by]: <Public Key String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.message || !args.signature) {
    return cbk([500, 'Expected lnd grpc api, message, signature']);
  }

  return args.lnd_grpc_api.verifyMessage({
    msg: Buffer.from(args.message, 'utf8'),
    signature: args.signature,
  },
  (err, res) => {
    if (!!err) {
      return cbk([500, 'Unexpected verify message error', err]);
    }

    if (!res.pubkey) {
      return cbk([500, 'Expected signature', res]);
    }

    if (!res.valid) {
      return cbk(null, {});
    }

    return cbk(null, {signed_by: res.pubkey});
  });
};

