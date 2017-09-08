const parseQueryString = require('querystring').parse;
const parseUrl = require('url').parse;

const secretKey = process.env.LNSERVICE_SECRET_KEY;
const urlPrefix = '/?';

/** Verify a websocket client

  {
    origin: <Websocket URL String>
  }

  @returns via cbk // Note, result is returned in as first arg in cbk
  <Is Authenticated Bool>
*/
module.exports = (args, cbk) => {
  if (!secretKey || !args || !args.req || !args.req.url) {
    return false;
  }

  const parsedQuery = parseQueryString(args.req.url.slice(urlPrefix.length));

  if (!parsedQuery || !parsedQuery.secret_key) {
    return false;
  }

  return cbk(parsedQuery.secret_key === secretKey);
};

