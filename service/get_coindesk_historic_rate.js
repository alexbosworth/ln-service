const asyncRetry = require('async/retry');
const request = require('request');

const API = 'https://api.coindesk.com/v1/';
const decBase = 10;
const REMOTE_SERVICE_TIMEOUT_MS = 20 * 1000;

/** Get the number of USD cents for a Bitcoin

  {
    time: <Epoch Time Number>
  }

  @returns via cbk
  {
    cents_per_bitcoin: <Cents Number>
  }
*/
module.exports = ({time}, cbk) => {
  return asyncRetry({
    interval: retryCount => 50 * Math.pow(2, retryCount),
    times: 10,
  },
  cbk => {
    const endTime = time * 1000;
    const startTime = (time - 1 - 24 * 60 * 60) * 1000;

    const end = new Date(endTime).toISOString().substring(0, 10);
    const start = new Date(startTime).toISOString().substring(0, 10);

    return request({
      json: true,
      qs: {end, start},
      timeout: REMOTE_SERVICE_TIMEOUT_MS,
      url: `${API}bpi/historical/close.json`,
    },
    (err, r, body) => {
      if (!!err) {
        return cbk([503, 'GetPriceFail', err]);
      }

      if (!body.bpi || !body.bpi[start]) {
        return go_on([503, 'ExpectedPrice', body]);
      }

      const centsPerBtc = parseInt((body.bpi[start] * 100, decBase).toFixed());

      return cbk(null, {cents_per_bitcoin: centsPerBtc});
    });
  },
  cbk);
};

