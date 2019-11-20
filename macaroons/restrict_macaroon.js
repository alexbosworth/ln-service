const {importMacaroon} = require('macaroon');
const isBase64 = require('is-base64');

/** Restrict an access macaroon

  {
    [expires_at]: <Expires At ISO 8601 Date String>
    [ip]: <IP Address String>
    macaroon: <Base64 Encoded Macaroon String>
  }

  @throws
  <Error>

  @returns
  {
    macaroon: <Restricted Base64 Encoded Macaroon String>
  }
*/
module.exports = args => {
  if (!isBase64(args.macaroon)) {
    throw new Error('ExpectedMacaroonToAddRestrictions');
  }

  const macaroon = importMacaroon(Buffer.from(args.macaroon, 'base64'));

  if (!!args.expires_at) {
    macaroon.addFirstPartyCaveat(`time-before ${args.expires_at}`);
  }

  if (!!args.ip) {
    macaroon.addFirstPartyCaveat(`ipaddr ${args.ip}`);
  }

  return {macaroon: Buffer.from(macaroon.exportBinary()).toString('base64')};
};
