const _ = require('lodash');
const asyncRetry = require('async/retry');
const request = require('request');

const api = 'https://apiv2.bitcoinaverage.com/';
const centsPerUnit = 100;
const intBase = 10;
const remoteServiceTimeoutMs = 20 * 1000;
const usdCentsCacheTimeMs = 10 * 60 * 1000;

let centsPerBTC = null;

/** Get the number of cents for a Bitcoin from BitcoinAverage

  {
    currency_code: <Currency String>
  }

  @returns via cbk
  {
    cents_per_bitcoin: <Cents Number>
  }
*/
module.exports = (args, cbk) => {
  if (!args.currency_code) {
    return cbk([400, 'Expected currency code']);
  }

  if (!_.includes(['USD'], args.currency_code)) {
    return cbk([400, 'Expected known currency code']);
  }

  if (!!centsPerBTC && Date.now() - centsPerBTC.date > usdCentsCacheTimeMs) {
    return cbk(null, {cents_per_bitcoin: centsPerBTC.cents_per_bitcoin});
  }

  return asyncRetry({
    interval: (retryCount) => { return 50 * Math.pow(2, retryCount); },
    times: 10,
  },
  (cbk) => {
    return request({
      json: true,
      timeout: remoteServiceTimeoutMs,
      url: `${api}indices/global/ticker/BTCUSD`,
    },
    (err, r, body) => {
      if (!!err) {
        return cbk([500, 'Get price fail', err]);
      }

      if (!body || !body.last) {
        return cbk([500, 'Expected currency data', body]);
      }

      const cents = parseInt(body.last * centsPerUnit, intBase);

      centsPerBTC = {cents_per_bitcoin: cents, date: Date.now()};

      return cbk(null, {cents_per_bitcoin: cents});
    });
  },
  (err, result) => {
    if (!!err) {
      return cbk(err);
    }

    return cbk(null, result);
  });
};

