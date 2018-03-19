const asyncRetry = require('async/retry');
const {includes} = require('lodash');
const request = require('request');

const centsPerUnit = 100;
const coindeskApi = 'https://api.coindesk.com/v1/';
const intBase = 10;
const remoteServiceTimeoutMs = 20 * 1000;

/** Get the number of cents for a Bitcoin

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
    return cbk([400, 'ExpectedCurrencyCode']);
  }

  if (!includes(['EUR', 'GBP', 'USD'], args.currency_code)) {
    return cbk([400, 'ExpectedKnownCurrencyCode']);
  }

  return asyncRetry({
    interval: retryCount => 50 * Math.pow(2, retryCount),
    times: 10,
  },
  cbk => {
    return request({
      json: true,
      timeout: remoteServiceTimeoutMs,
      url: `${coindeskApi}bpi/currentprice.json`,
    },
    (err, r, body) => {
      if (!!err) {
        return cbk([503, 'GetPriceErr', err]);
      }

      if (!body || !body.bpi || !body.bpi[args.currency_code]) {
        return cbk([503, 'ExpectedCurrencyData', body]);
      }

      const rate = body.bpi[args.currency_code].rate_float;

      if (!rate) {
        return cbk([503, 'ExpectedCurrencyRate']);
      }

      const cents = parseInt(rate * centsPerUnit, intBase);

      return cbk(null, {cents_per_bitcoin: cents});
    });
  },
  cbk);
};

