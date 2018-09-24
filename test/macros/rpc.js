const https = require('https');

const defaultTimeout = 1000 * 30;
const agents = {};

let requests = 0;

/** Call JSON RPC

  {
    cert: <Cert Buffer Object>
    cmd: <Command String>
    host: <Host Name String>
    params: [<Parameter Object>]
    pass: <Password String>
    port: <Port Number>
    [timeout]: <Milliseconds Timeout Number>
    user: <Username String>
  }

  @returns via cbk
  <Result Object>
*/
module.exports = (args, cbk) => {
  const service = `${args.host}:${args.port}`;

  const post = JSON.stringify({
    id: `${++requests}`,
    method: args.cmd,
    params: args.params,
  });

  const req = https.request({
    auth: `${args.user}:${args.pass}`,
    ca: [args.cert],
    cert: args.cert,
    ecdhCurve: 'auto',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': post.length,
    },
    hostname: args.host,
    key: args.key,
    method: 'POST',
    path: '/',
    port: args.port,
  },
  res => {
    let data = '';

    res.setEncoding('utf8');

    res.on('data', chunk => data += chunk);

    res.on('end', () => {
      switch (res.statusCode) {
      case 401:
        return cbk([401, 'InvalidAuthenticationForRpc']);

      default:
        try {
          return cbk(null, JSON.parse(data).result);
        } catch (err) {
          return cbk([503, 'InvalidDataResponseForRpcCall']);
        }
      }
    });
  });

  req.on('error', err => cbk([503, 'FailedToCallRpc', err.message]));

  req.setTimeout(args.timeout || defaultTimeout, () => {
    req.abort();

    return cbk([503, 'RpcOperationTimedOut']);
  });

  req.write(post);

  req.end()

  return;
};

