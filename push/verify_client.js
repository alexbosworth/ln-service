const parseQueryString = require('querystring').parse;
const parseUrl = require('url').parse;

const secretKey = process.env.LNSERVICE_SECRET_KEY;

/** Verify a websocket client

  {
    origin: <Websocket URL String>
  }
*/
module.exports = (args) => {
  if (!args || !args.req || !args.req.headers || !args.req.headers.origin) {
    return false;
  }

  const originUrl = parseUrl(args.req.headers.origin);

  if (!originUrl || !originUrl.query) {
    return false;
  }

  const parsedQuery = parseQueryString(originUrl.query);

  if (!parsedQuery || !parsedQuery.secret_key) {
    return false;
  }

  return parsedQuery.secret_key === secretKey;
};

