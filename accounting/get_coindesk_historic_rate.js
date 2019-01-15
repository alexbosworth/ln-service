const asyncRetry = require('async/retry');
const request = require('request');

const api = 'https://api.coindesk.com/v1/';
const closePath = 'bpi/historical/close.json';
const dayFormat = 'yyyy-mm-dd';
const decBase = 10;
const interval = retryCount => 50 * Math.pow(2, retryCount);
const msPerDay = 1000 * 60 * 60 * 24;
const {parse} = Date;
const rates = {};
const remoteServiceTimeoutMs = 20 * 1000;
const times = 10;

/** Get the number of cents for a big unit token

  {
    currency: <Currency Type String>
    date: <ISO 8601 Date String>
    fiat: <Fiat Type String>
  }

  @returns via cbk
  {
    cents: <Cents Per Token Number>
  }
*/
module.exports = ({currency, date, fiat}, cbk) => {
  if (currency !== 'BTC') {
    return cbk([400, 'UnsupportedCurrencyTypeForHistoricFiatRateLookup']);
  }

  if (!date) {
    return cbk([400, 'ExpectedDateForHistoricRateLookup']);
  }

  if (fiat !== 'USD') {
    return cbk([400, 'UnsupportedFiatTypeForHistoricFiatRateLookup']);
  }

  const roughDate = date.substring(0, dayFormat.length);
  const start = new Date(parse(date) - msPerDay).toISOString();

  const startDay = start.substring(0, dayFormat.length);

  // Exit early when a cache exists
  if (!!rates[roughDate]) {
    return cbk(null, {cents: rates[roughDate]});
  }

  return asyncRetry({interval, times}, cbk => {
    return request({
      json: true,
      qs: {end: roughDate, start: startDay},
      timeout: remoteServiceTimeoutMs,
      url: `${api}${closePath}`,
    },
    (err, r, body) => {
      if (!!err) {
        return cbk([503, 'UnexpectedErrorGettingHistoricRate', err]);
      }

      if (!body || !body.bpi || !body.bpi[startDay]) {
        return cbk([503, 'UnexpectedResponseInHistoricRateResponse', body, startDay]);
      }

      const cents = body.bpi[startDay] * 100;

      rates[roughDate] = cents;

      return cbk(null, {cents: cents});
    });
  },
  cbk);
};
