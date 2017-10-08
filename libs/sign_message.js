/** Sign a message

  {
    lnd_grpc_api: <Object>
    message: <Message String>
  }

  {
    signature: <Signature String>
  }
*/
module.exports = (args, cbk) => {
  if (!args.lnd_grpc_api || !args.message) {
    return cbk([500, 'Expected lnd grpc api, message']);
  }

  return args.lnd_grpc_api.signMessage({msg: args.message}, (err, res) => {
    if (!!err) {
      return cbk([500, 'Unexpected sign message error', err]);
    }

    if (!res.signature) {
      return cbk([500, 'Expected signature', res]);
    }

    return cbk(null, {signature: res.signature});
  });
};

