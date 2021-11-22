const fetch = require('@alexbosworth/node-fetch');
const http = require('http');
const https = require('https');

const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const defaultTimeout = 1000 * 30;
const agents = {};
let requests = 0;

/** Call JSON RPC

  {
    [cert]: <Cert Buffer Object>
    cmd: <Command String>
    host: <Host Name String>
    params: [<Parameter Object>]
    pass: <Password String>
    port: <Port Number>
    [timeout]: <Milliseconds Timeout Number>
    user: <Username String>
  }

  @returns via cbk or Promise
  <Result Object>
*/
module.exports = (args, cbk) => {
  return new Promise((resolve, reject) => {
    return asyncAuto({
      // Check arguments
      validate: cbk => {
        return cbk();
      },

      // Derive an HTTP agent as necessary for using a self-signed cert
      agent: ['validate', async ({}) => {
        // Exit early when there is no cert and this is a regular HTTP request
        if (!args.cert) {
          return new http.Agent({});
        }

        return new https.Agent({
          ca: [args.cert],
          cert: args.cert,
          ecdhCurve: 'auto',
        });
      }],

      // Send request to the server
      request: ['agent', async ({agent}) => {
        const credentials = Buffer.from(`${args.user}:${args.pass}`);
        const scheme = !!args.cert ? 'https' : 'http';

        try {
          const response = await fetch(
            `${scheme}://${args.host}:${args.port}/`,
            {
              agent,
              body: JSON.stringify({
                jsonrpc: '1.0',
                id: `${++requests}`,
                method: args.cmd,
                params: args.params,
              }),
              headers: {
                'Authorization': `Basic ${credentials.toString('base64')}`,
                'Content-Type': 'application/json',
              },
              method: 'POST',
            },
          );

          return (await response.json()).result;
        } catch (err) {
          throw [503, 'UnexpectedErrorFromRpcService', {err}];
        }
      }],
    },
    returnResult({reject, resolve, of: 'request'}, cbk));
  });
};
